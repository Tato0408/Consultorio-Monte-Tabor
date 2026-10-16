import inventoryModel from "../../models/inventory/inventory.js";
import movementModel from "../../models/inventory/movements.js";
import { notifyLowStockAdmins, notify_expiry_admins } from "../../services/notificationService.js";
import { getNonNegativeError, escapeRegex } from "../../utils/validators.js";

const inventoryController = {};

// Cambia el stock de un insumo de forma ATÓMICA, evitando un "lost update": antes,
// adjustStock/stockEntry/manualUsage/discountMaterialsForProcedure leían el insumo con
// findById, calculaban el nuevo stock en memoria y lo guardaban con item.save() — si dos
// requests tocaban el mismo insumo casi al mismo tiempo (ej. dos enfermeras registrando
// uso del mismo insumo desechable), ambas leían el mismo stock de partida, y la segunda
// en guardar pisaba el resultado de la primera sin tomarlo en cuenta: el insumo quedaba
// mostrando más stock del que de verdad había, con dos movimientos en la bitácora que no
// cuadraban contra el stock final.
//
// delta puede ser positivo (entrada/aumento) o negativo (uso/disminución). Para un delta
// negativo, igual que antes, si se pide descontar más de lo que hay solo se descuenta lo
// que existe (nunca queda negativo) — "applied" es la cantidad realmente aplicada, para
// que la bitácora y el mensaje de "stock insuficiente" sigan reflejando la realidad.
//
// La atomicidad viene de condicionar el update al valor de stock leído (findOneAndUpdate
// con stock: current.stock en el filtro): si otra escritura concurrente ya cambió el
// documento, el filtro no calza, updated sale null, y se reintenta releyendo el stock
// real más reciente — optimistic concurrency, sin necesitar una transacción de Mongo.
async function applyStockDelta(itemId, delta, { setLastUsed = false } = {}) {
  // 20 intentos alcanza de sobra para el tráfico real (unas pocas personas tocando el
  // mismo insumo casi al mismo tiempo); la espera aleatoria entre reintentos (en vez de
  // reintentar inmediato) separa a los que están chocando para que no seguir
  // colisionando en el siguiente intento.
  const MAX_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));
    }
    const current = await inventoryModel.findById(itemId);
    if (!current) return null;

    const applied = delta < 0 ? -Math.min(-delta, current.stock) : delta;
    const update = { $set: { stock: current.stock + applied } };
    if (setLastUsed) update.$set.last_used = new Date();

    const updated = await inventoryModel.findOneAndUpdate(
      { _id: itemId, stock: current.stock },
      update,
      { new: true }
    );
    if (updated) return { item: updated, applied };
    // Otra escritura concurrente cambió el stock entre el read y el write de arriba:
    // se reintenta con el valor real más reciente en vez de pisarlo a ciegas.
  }
  throw new Error("No se pudo actualizar el stock: demasiados cambios simultáneos sobre el mismo insumo. Intenta de nuevo.");
}

// GET todos, con paginación y filtros.
inventoryController.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 8, category, status, expiry, search } = req.query;
    const query = {};

    if (category && category !== "Todas") query.category = category;
    if (search) query.name = { $regex: escapeRegex(search), $options: "i" };

    if (status && status !== "Todos") {
      if (status === "Disponible") {
        query.$expr = { $gt: ["$stock", "$min_stock"] };
      } else if (status === "Bajo") {
        query.$expr = {
          $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }],
        };
      } else if (status === "Crítico") {
        query.stock = { $lte: 0 };
      }
    }

    // Caducidad: independiente del estado de stock de arriba. La ventana de
    // "Próximo a vencer" es la misma que usa el virtual expiryStatus del
    // modelo (30 días) y el widget de próximos a vencer del dashboard.
    if (expiry && expiry !== "Todas") {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expiry === "Caduco") {
        query.expiration_date = { $ne: null, $lte: now };
      } else if (expiry === "Próximo a vencer") {
        query.expiration_date = { $gt: now, $lte: in30Days };
      } else if (expiry === "Vigente") {
        query.$or = [{ expiration_date: null }, { expiration_date: { $gt: in30Days } }];
      }
    }

    const total = await inventoryModel.countDocuments(query);
    const items = await inventoryModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      insumos: items,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    return res.status(500).json({ message: "Error interno", error: error.message });
  }
};

// GET por id.
inventoryController.getById = async (req, res) => {
  try {
    const item = await inventoryModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });
    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ message: "Error interno" });
  }
};

// POST, crea un insumo.
inventoryController.create = async (req, res) => {
  try {
    const {
      name, description, category, stock, unit_measure,
      price, min_stock, expiration_date, supplier,
    } = req.body;

    const numberError = getNonNegativeError(stock, "El stock")
      || getNonNegativeError(price, "El precio")
      || getNonNegativeError(min_stock, "El stock mínimo");
    if (numberError) return res.status(400).json({ message: numberError });

    const newItem = new inventoryModel({
      name, description, category,
      stock:           Number(stock),
      unit_measure,
      price:           Number(price) || 0,
      min_stock:       Number(min_stock) || 5,
      expiration_date: expiration_date ? new Date(expiration_date) : null,
      supplier,
    });

    await newItem.save();
    await notifyLowStockAdmins(newItem).catch((error) => console.log("Error notificando inventario:", error));
    await notify_expiry_admins(newItem).catch((error) => console.log("Error notificando vencimiento:", error));

    // Registrar movimiento inicial si hay stock
    if (Number(stock) > 0) {
      await new movementModel({
        type:     "Stock entry",
        item:     newItem._id,
        itemName: name,
        quantity: Number(stock),
        detail:   "Initial stock on product creation",
        user:     "Admin. Sistema",
      }).save();
    }

    return res.status(201).json({ message: "Insumo creado exitosamente", item: newItem });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear insumo", error: error.message });
  }
};

// PUT, actualiza un insumo.
inventoryController.update = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await inventoryModel.findById(id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

    const numberError = getNonNegativeError(req.body.stock, "El stock")
      || getNonNegativeError(req.body.price, "El precio")
      || getNonNegativeError(req.body.min_stock, "El stock mínimo");
    if (numberError) return res.status(400).json({ message: numberError });

    // Whitelist de campos editables (igual que los que acepta create): antes era
    // { ...req.body } completo, sin filtrar — cualquier caller con permiso de editar
    // inventario podía mandar cualquier campo del esquema en el body (mass assignment),
    // no solo los que el formulario de edición realmente expone.
    const EDITABLE_FIELDS = ["name", "description", "category", "stock", "unit_measure", "price", "min_stock", "expiration_date", "supplier"];
    const updateData = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.stock)           updateData.stock           = Number(updateData.stock);
    if (updateData.price)           updateData.price           = Number(updateData.price);
    if (updateData.min_stock)       updateData.min_stock       = Number(updateData.min_stock);
    if (updateData.expiration_date) updateData.expiration_date = new Date(updateData.expiration_date);
    else if (updateData.expiration_date === "") updateData.expiration_date = null;

    const updatedItem = await inventoryModel.findByIdAndUpdate(id, updateData, { new: true });
    await notifyLowStockAdmins(updatedItem).catch((error) => console.log("Error notificando inventario:", error));
    await notify_expiry_admins(updatedItem).catch((error) => console.log("Error notificando vencimiento:", error));
    return res.status(200).json({ message: "Insumo actualizado", item: updatedItem });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar", error: error.message });
  }
};

// DELETE, elimina un insumo.
inventoryController.remove = async (req, res) => {
  try {
    const item = await inventoryModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

    await inventoryModel.findByIdAndDelete(req.params.id);
    // Eliminar también sus movimientos
    await movementModel.deleteMany({ item: req.params.id });

    return res.status(200).json({ message: "Insumo eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar" });
  }
};

// GET, estadísticas del dashboard.
inventoryController.getStats = async (req, res) => {
  try {
    const total = await inventoryModel.countDocuments();

    const lowStock = await inventoryModel.countDocuments({
      $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }] },
    });

    const critical = await inventoryModel.countDocuments({ stock: { $lte: 0 } });

    const valueResult = await inventoryModel.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ["$stock", "$price"] } } } },
    ]);
    const totalValue = valueResult[0]?.total || 0;

    // Productos utilizados hoy
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const utilizadosHoy = await movementModel.countDocuments({
      type: { $in: ["Treatment use", "Manual use"] },
      date: { $gte: startOfDay },
    });

    // Próximos a vencer: los que vencen dentro de los próximos 30 días (misma
    // ventana que el virtual expiryStatus del modelo) y también los que ya
    // vencieron (esos son los más urgentes, por eso el orden ascendente los
    // deja primero). expiration_date se guarda siempre como Date (ver el
    // modelo), así que basta comparar contra el límite superior.
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = await inventoryModel.find({
      expiration_date: { $ne: null, $lte: in30Days },
    })
    .sort({ expiration_date: 1 })
    .limit(5)
    .select("name expiration_date unit_measure");

    // Alertas de stock bajo o crítico (stock en cero o por debajo del mínimo).
    const alerts = await inventoryModel
      .find({
        $or: [
          { stock: { $lte: 0 } },
          { $expr: { $lte: ["$stock", "$min_stock"] } },
        ],
      })
      .sort({ stock: 1 })
      .limit(5)
      .select("name stock min_stock unit_measure");

    // Tendencias reales de los últimos 7 días para las mini gráficas
    // (sparklines) de las tarjetas KPI de InventoryStats.jsx. No
    // existe una colección de snapshots históricos de stock, así que
    // se reconstruye a partir del stock actual de cada producto,
    // deshaciendo hacia atrás los movimientos de la bitácora
    // (movements.quantity ya es positivo para entradas y negativo
    // para salidas, ver models/inventory/movements.js).
    const MS_DAY = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // dayBoundaries[0] es el fin de hoy (el momento actual de cada
    // producto, sin deshacer nada) y dayBoundaries[6] es el fin de
    // hace 6 días.
    const dayBoundaries = Array.from({ length: 7 }, (_, i) =>
      new Date(startOfToday.getTime() + MS_DAY - 1 - i * MS_DAY)
    );
    const windowStart = new Date(startOfToday.getTime() - 6 * MS_DAY);

    const [allItems, recentMovements] = await Promise.all([
      inventoryModel.find().select("stock min_stock price").lean(),
      movementModel.find({ date: { $gte: windowStart } }).select("item quantity date type").sort({ date: -1 }).lean(),
    ]);

    const movementsByItem = new Map();
    for (const m of recentMovements) {
      const key = String(m.item);
      if (!movementsByItem.has(key)) movementsByItem.set(key, []);
      movementsByItem.get(key).push(m);
    }

    // Índice 0 = hoy ... 6 = hace 6 días (se invierte al armar la respuesta, más abajo).
    const stockTrend = new Array(7).fill(0);
    const lowStockTrend = new Array(7).fill(0);
    const valueTrend = new Array(7).fill(0);
    const usedTrend = new Array(7).fill(0);

    for (const item of allItems) {
      const itemMovements = movementsByItem.get(String(item._id)) || [];
      let running = item.stock;
      let ptr = 0;
      for (let i = 0; i < 7; i++) {
        const cutoff = dayBoundaries[i];
        // Deshace (resta) los movimientos posteriores a este corte de
        // día, para dejar running como el stock que tenía este
        // producto justo al final de ese día.
        while (ptr < itemMovements.length && itemMovements[ptr].date > cutoff) {
          running -= itemMovements[ptr].quantity;
          ptr++;
        }
        stockTrend[i] += running;
        valueTrend[i] += running * (item.price || 0);
        if (running <= (item.min_stock || 0)) lowStockTrend[i] += 1;
      }
    }

    // Utilizados no necesita reconstrucción: es la suma directa de
    // movimientos de uso (Treatment use y Manual use) que realmente
    // ocurrieron cada día.
    for (const m of recentMovements) {
      if (m.type !== "Treatment use" && m.type !== "Manual use") continue;
      const movementDayStart = new Date(m.date);
      movementDayStart.setHours(0, 0, 0, 0);
      const daysAgo = Math.round((startOfToday - movementDayStart) / MS_DAY);
      if (daysAgo >= 0 && daysAgo < 7) usedTrend[daysAgo] += Math.abs(m.quantity);
    }

    // Etiquetas en formato dd/mm en orden cronológico (de hace 6 días
    // a hoy), mismo formato que dailyMovements en getCharts.
    const dayLabel = (daysAgo) => {
      const d = new Date(startOfToday.getTime() - daysAgo * MS_DAY);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const toSeries = (arr) =>
      Array.from({ length: 7 }, (_, i) => {
        const daysAgo = 6 - i;
        return { day: dayLabel(daysAgo), total: arr[daysAgo] };
      });

    const trends = {
      stock: toSeries(stockTrend),
      lowStock: toSeries(lowStockTrend),
      used: toSeries(usedTrend),
      value: toSeries(valueTrend),
    };

    return res.status(200).json({
      total,
      bajoStock:       lowStock,
      critico:         critical,
      valorTotal:      totalValue,
      utilizadosHoy,
      proximosAVencer: expiringSoon,
      alertas:         alerts,
      trends,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// GET, movimientos recientes.
inventoryController.getMovements = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const movements = await movementModel
      .find()
      .populate("item", "name unit_measure")
      .sort({ date: -1 })
      .limit(Number(limit));

    return res.status(200).json(movements);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener movimientos" });
  }
};

// POST, ajuste de inventario.
inventoryController.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, adjustType, reason, responsible, notes } = req.body;

    const quantityError = getNonNegativeError(quantity, "La cantidad");
    if (quantityError) return res.status(400).json({ message: quantityError });

    const qty = Number(quantity);
    const delta = adjustType === "aumentar" ? qty : -qty;
    const result = await applyStockDelta(id, delta);
    if (!result) return res.status(404).json({ message: "Insumo no encontrado" });
    const { item, applied: appliedDelta } = result;
    // appliedQty siempre positivo (lo que ya esperan el mensaje/la bitácora de abajo),
    // applyStockDelta devuelve el delta con signo.
    const appliedQty = Math.abs(appliedDelta);

    await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

    await new movementModel({
      type:     "Inventory adjustment",
      item:     item._id,
      itemName: item.name,
      quantity: adjustType === "aumentar" ? appliedQty : -appliedQty,
      detail:   reason,
      user:     responsible,
      patient:  notes || null,
    }).save();

    const capped = adjustType !== "aumentar" && appliedQty < qty;
    return res.status(200).json({
      message: capped
        ? `Ajuste realizado. Solo había ${appliedQty} en stock: se descontó esa cantidad, no las ${qty} solicitadas.`
        : "Ajuste realizado",
      item,
      capped,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al realizar ajuste", error: error.message });
  }
};

// POST, entrada de stock.
inventoryController.stockEntry = async (req, res) => {
  try {
    const { name, category, unit_measure, supplier, quantity, unit_cost, min_stock, detalle } = req.body;

    const hasMinStock = min_stock !== undefined && min_stock !== null && String(min_stock).trim() !== "";

    const numberError = getNonNegativeError(quantity, "La cantidad")
      || getNonNegativeError(unit_cost, "El costo unitario")
      || (hasMinStock ? getNonNegativeError(min_stock, "El stock mínimo") : null);
    if (numberError) return res.status(400).json({ message: numberError });

    const qty  = Number(quantity);
    const cost = Number(unit_cost) || 0;
    // Cantidad mínima a partir de la cual el producto se considera en "stock
    // bajo". Si no llega, se mantiene la que ya tenía el producto (o 5 para
    // uno nuevo).
    const minStock = hasMinStock ? Number(min_stock) : null;

    // Busca si ya existe por nombre, comparación insensible a
    // mayúsculas y a espacios extra (Guantes y guantes con espacio
    // deben fusionar el mismo producto, no crear uno duplicado).
    const normalizedName = String(name || "").trim();
    let item = await inventoryModel.findOne({ name: new RegExp(`^${escapeRegex(normalizedName)}$`, "i") });

    // La categoría es obligatoria solo cuando esta entrada va a crear
    // un producto nuevo (si ya existe, conserva la categoría con la
    // que se registró la primera vez). Sin este chequeo, un producto
    // podía quedar sin categoría y desaparecer del gráfico por
    // categoría.
    if (!item && !String(category || "").trim()) {
      return res.status(400).json({ message: "La categoría es requerida para registrar un producto nuevo." });
    }

    if (item) {
      // El stock se incrementa de forma atómica (ver applyStockDelta) para no perder un
      // aumento si dos entradas de stock del mismo insumo se registran casi al mismo
      // tiempo. price/min_stock no tienen ese problema (es "pisar con el valor nuevo",
      // no "sumar sobre el valor viejo"), se actualizan aparte.
      const result = await applyStockDelta(item._id, qty);
      item = result.item;
      const fieldsToUpdate = { price: cost };
      if (minStock !== null) fieldsToUpdate.min_stock = minStock;
      item = await inventoryModel.findByIdAndUpdate(item._id, { $set: fieldsToUpdate }, { new: true });
      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));
    } else {
      item = await new inventoryModel({
        name: normalizedName, category, unit_measure,
        stock: qty, min_stock: minStock !== null ? minStock : 5, price: cost, supplier,
      }).save();
      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));
    }

    await new movementModel({
      type:     "Stock entry",
      item:     item._id,
      itemName: item.name,
      quantity: qty,
      detail:   detalle || `Compra a ${supplier || "proveedor"}`,
      user:     "Admin. Sistema",
    }).save();

    return res.status(200).json({ message: "Entrada de stock registrada", item });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar entrada", error: error.message });
  }
};

// POST, uso manual.
inventoryController.manualUsage = async (req, res) => {
  try {
    const { responsible, reason, patient, items } = req.body;
    // items: [{ insumoId, quantity }]

    const quantityError = (items || []).map((entry) => getNonNegativeError(entry.quantity, "La cantidad")).find(Boolean);
    if (quantityError) return res.status(400).json({ message: quantityError });

    const cappedItems = [];
    for (const entry of items) {
      const requested = Number(entry.quantity);
      // applyStockDelta descuenta de forma atómica y ya capa a lo que de verdad hay
      // disponible (ver su comentario) — evita que dos usos manuales del mismo insumo
      // casi simultáneos se pisen entre sí.
      const result = await applyStockDelta(entry.insumoId, -requested, { setLastUsed: true });
      if (!result) continue;
      const { item, applied: appliedDelta } = result;
      const applied = -appliedDelta;
      // Antes la bitácora igual registraba la cantidad PEDIDA, no la
      // aplicada: con 3 en stock y un uso de 10, el stock quedaba en 0 pero
      // el historial decía "-10 uds", una cantidad que nunca existió.
      if (applied < requested) cappedItems.push({ name: item.name, requested, applied });

      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

      await new movementModel({
        type:     "Manual use",
        item:     item._id,
        itemName: item.name,
        quantity: -applied,
        detail:   reason,
        user:     responsible,
        patient:  patient || null,
      }).save();
    }

    const message = cappedItems.length
      ? `Uso manual registrado. Stock insuficiente para ${cappedItems.map((c) => `${c.name} (se descontaron ${c.applied} de ${c.requested} pedidas)`).join(", ")}.`
      : "Uso manual registrado";
    return res.status(200).json({ message, capped: cappedItems.length > 0 });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar uso manual", error: error.message });
  }
};

// Descuento real de inventario al registrar un procedimiento en el
// expediente.
// Se llama directamente desde patientsController (no por HTTP) cuando
// se registra un procedimiento nuevo en la ficha de un paciente
// (new_procedure). Usa directamente el catálogo de materiales ya
// definido en el procedimiento (Procedures.materials), sin depender
// de que alguien los vuelva a escribir. Los materiales sin insumo
// vinculado (materiales antiguos con solo un nombre libre, ver
// ProceduresForm.jsx) se ignoran silenciosamente: no hay ningún
// insumo real que descontar.
inventoryController.discountMaterialsForProcedure = async ({ materials, patientName, responsible, procedureType }) => {
  for (const material of materials || []) {
    const quantity = Number(material.quantity) || 0;
    if (!material.insumo || quantity <= 0) continue;

    // applyStockDelta descuenta de forma atómica y ya capa a lo que de verdad hay
    // disponible (ver su comentario) — evita que dos procedimientos que usan el mismo
    // insumo, registrados casi al mismo tiempo, se pisen entre sí.
    const result = await applyStockDelta(material.insumo, -quantity, { setLastUsed: true });
    if (!result) continue;
    const { item, applied: appliedDelta } = result;
    const applied = -appliedDelta;
    // La bitácora debe registrar esa cantidad real, no la pedida por el
    // catálogo del procedimiento (antes quedaba, por ejemplo, "-10 uds" con
    // solo 3 en stock, una cantidad que nunca existió).
    if (applied < quantity) {
      console.log(`Inventario insuficiente para "${item.name}": se pidieron ${quantity}, solo había ${item.stock - applied}.`);
    }

    notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

    await new movementModel({
      type: "Treatment use",
      item: item._id,
      itemName: item.name,
      quantity: -applied,
      detail: `Procedimiento: ${procedureType || "Procedimiento"}`,
      user: responsible || "Sistema",
      patient: patientName || null,
    }).save();
  }
};

// Descuento real de inventario al guardar una consulta.
// Suma la cantidad usada por insumo a través de todos los
// procedimientos de una consulta (una misma consulta puede tener
// varios procedimientos, y cada uno varios materiales).
const sumMaterialUsage = (procedureRows) => {
  const totals = new Map();
  for (const proc of procedureRows || []) {
    for (const m of proc?.material_used || []) {
      if (!m?.inventory_id || !Number(m.quantity)) continue;
      const key = String(m.inventory_id);
      totals.set(key, (totals.get(key) || 0) + Number(m.quantity));
    }
  }
  return totals;
};

// Se llama directamente desde consultationController (no por HTTP) al
// crear o editar una consulta, para que material_used descuente
// stock de verdad. Compara lo que la consulta usaba antes contra lo
// que usa ahora y solo mueve la diferencia: así, editar una consulta
// ya guardada no vuelve a descontar el total desde cero, y si el
// doctor reduce o quita un material, la diferencia se repone
// automáticamente.
inventoryController.applyMaterialUsageDelta = async ({
  previousProcedureRows,
  procedureRows,
  patientName,
  responsible,
  procedureType,
  session,
}) => {
  const previousTotals = sumMaterialUsage(previousProcedureRows);
  const newTotals = sumMaterialUsage(procedureRows);
  const inventoryIds = new Set([...previousTotals.keys(), ...newTotals.keys()]);

  for (const inventoryId of inventoryIds) {
    const delta = (newTotals.get(inventoryId) || 0) - (previousTotals.get(inventoryId) || 0);
    if (!delta) continue;

    const item = await inventoryModel.findById(inventoryId).session(session);
    if (!item) continue;

    // Solo el sentido "se usó más material" (delta > 0) puede toparse con el
    // stock disponible; el sentido contrario (se redujo el material usado)
    // repone y nunca necesita recortarse. Antes la bitácora registraba
    // siempre el delta PEDIDO, no el aplicado.
    const appliedDelta = delta > 0 ? Math.min(delta, item.stock) : delta;
    if (appliedDelta !== delta) {
      console.log(`Inventario insuficiente para "${item.name}": se pidieron ${delta}, solo había ${item.stock}.`);
    }

    item.stock = item.stock - appliedDelta;
    if (delta > 0) item.last_used = new Date();
    await item.save({ session });

    await new movementModel({
      type:     delta > 0 ? "Treatment use" : "Inventory adjustment",
      item:     item._id,
      itemName: item.name,
      quantity: -appliedDelta,
      detail:   delta > 0
        ? `Procedimiento: ${procedureType || "Consulta médica"}`
        : `Ajuste por edición de consulta (se redujo el material usado): ${procedureType || "Consulta médica"}`,
      user:     responsible || "Sistema",
      patient:  patientName || null,
    }).save({ session });

    // Fuera de la transacción a propósito: si notificar falla, no debe tumbar el guardado
    // de la consulta (mismo criterio que el resto de este controlador).
    notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));
  }
};

// GET, datos para gráficas.
inventoryController.getCharts = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Movimientos diarios últimos 7 días (total de unidades por día)
    const dailyRaw = await movementModel.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%d/%m", date: "$date" } },
          total: { $sum: { $abs: "$quantity" } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: "$_id", total: 1 } },
    ]);

    // Top 5 insumos más utilizados (Treatment use + Manual use)
    const topRaw = await movementModel.aggregate([
      { $match: { type: { $in: ["Treatment use", "Manual use"] } } },
      {
        $group: {
          _id: "$itemName",
          value: { $sum: { $abs: "$quantity" } },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$_id", value: 1 } },
    ]);

    const totalUsed = topRaw.reduce((s, i) => s + i.value, 0);
    const topItems = topRaw.map((i) => ({
      ...i,
      pct: totalUsed > 0 ? `${Math.round((i.value / totalUsed) * 100)}%` : "0%",
    }));

    // Estado del inventario por categoría
    const byCatRaw = await inventoryModel.aggregate([
      {
        $group: {
          _id: "$category",
          Disponible: {
            $sum: { $cond: [{ $gt: ["$stock", "$min_stock"] }, 1, 0] },
          },
          Bajo: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }] },
                1,
                0,
              ],
            },
          },
          Crítico: {
            $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] },
          },
        },
      },
      { $project: { _id: 0, cat: "$_id", Disponible: 1, Bajo: 1, "Crítico": 1 } },
    ]);

    return res.status(200).json({
      dailyMovements: dailyRaw,
      topItems,
      byCategory: byCatRaw,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener datos de gráficas", error: error.message });
  }
};

export default inventoryController;
