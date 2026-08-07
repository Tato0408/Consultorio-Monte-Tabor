import inventoryModel from "../../models/inventory/inventory.js";
import movementModel from "../../models/inventory/movements.js";
import { v2 as cloudinary } from "cloudinary";
import { notifyLowStockAdmins } from "../../services/notificationService.js";

const inventoryController = {};

// ── GET todos (paginación + filtros) ──────────────────────────────────────────
inventoryController.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 8, category, status, search } = req.query;
    const query = {};

    if (category && category !== "Todas") query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

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

// ── GET por ID ────────────────────────────────────────────────────────────────
inventoryController.getById = async (req, res) => {
  try {
    const item = await inventoryModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });
    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ message: "Error interno" });
  }
};

// ── POST crear insumo ─────────────────────────────────────────────────────────
inventoryController.create = async (req, res) => {
  try {
    const {
      name, description, category, stock, unit_measure,
      price, min_stock, expiration_date, supplier,
    } = req.body;

    const newItem = new inventoryModel({
      name, description, category,
      stock:           Number(stock),
      unit_measure,
      price:           Number(price) || 0,
      min_stock:       Number(min_stock) || 5,
      expiration_date: expiration_date ? new Date(expiration_date) : null,
      supplier,
    });

    if (req.file) {
      newItem.image           = req.file.path;
      newItem.image_public_id = req.file.filename;
    }

    await newItem.save();
    await notifyLowStockAdmins(newItem).catch((error) => console.log("Error notificando inventario:", error));

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

// ── PUT actualizar insumo ─────────────────────────────────────────────────────
inventoryController.update = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await inventoryModel.findById(id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

    const updateData = { ...req.body };
    if (updateData.stock)           updateData.stock           = Number(updateData.stock);
    if (updateData.price)           updateData.price           = Number(updateData.price);
    if (updateData.min_stock)       updateData.min_stock       = Number(updateData.min_stock);
    if (updateData.expiration_date) updateData.expiration_date = new Date(updateData.expiration_date);
    else if (updateData.expiration_date === "") updateData.expiration_date = null;

    // Si llega imagen nueva, eliminar la anterior de Cloudinary
    if (req.file) {
      if (item.image_public_id) {
        await cloudinary.uploader.destroy(item.image_public_id);
      }
      updateData.image           = req.file.path;
      updateData.image_public_id = req.file.filename;
    }

    const updatedItem = await inventoryModel.findByIdAndUpdate(id, updateData, { new: true });
    await notifyLowStockAdmins(updatedItem).catch((error) => console.log("Error notificando inventario:", error));
    return res.status(200).json({ message: "Insumo actualizado", item: updatedItem });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar", error: error.message });
  }
};

// ── DELETE eliminar insumo ────────────────────────────────────────────────────
inventoryController.remove = async (req, res) => {
  try {
    const item = await inventoryModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

    if (item.image_public_id) {
      await cloudinary.uploader.destroy(item.image_public_id);
    }

    await inventoryModel.findByIdAndDelete(req.params.id);
    // Eliminar también sus movimientos
    await movementModel.deleteMany({ item: req.params.id });

    return res.status(200).json({ message: "Insumo eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar" });
  }
};

// ── GET estadísticas dashboard ────────────────────────────────────────────────
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

    // Próximos a vencer en 60 días (maneja fechas como string o como Date)
    const today    = new Date();
    const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Debug: ver todos los productos que tienen expiration_date
    const allWithDate = await inventoryModel
      .find({ expiration_date: { $ne: null, $exists: true } })
      .select("name expiration_date");
    console.log("[stats] productos con fecha:", allWithDate.map(p => ({
      name: p.name,
      expiration_date: p.expiration_date,
      type: typeof p.expiration_date,
    })));
    console.log("[stats] today:", today, "| in60Days:", in60Days);

    const todayStr    = today.toISOString().split("T")[0];
    const in60DaysStr = in60Days.toISOString().split("T")[0];

    const expiringSoon = await inventoryModel.find({
      $or: [
        { expiration_date: { $gte: today,     $lte: in60Days    } },
        { expiration_date: { $gte: todayStr,  $lte: in60DaysStr } },
      ],
    })
    .sort({ expiration_date: 1 })
    .limit(5)
    .select("name expiration_date unit_measure");

    // Alertas de stock bajo o crítico
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

    console.log("[stats] proximosAVencer:", expiringSoon);

    return res.status(200).json({
      total,
      bajoStock:       lowStock,
      critico:         critical,
      valorTotal:      totalValue,
      utilizadosHoy,
      proximosAVencer: expiringSoon,
      alertas:         alerts,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// ── GET movimientos recientes ─────────────────────────────────────────────────
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

// ── POST ajuste de inventario ─────────────────────────────────────────────────
inventoryController.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, adjustType, reason, responsible, notes } = req.body;

    const item = await inventoryModel.findById(id);
    if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

    const qty = Number(quantity);
    if (adjustType === "aumentar") {
      item.stock += qty;
    } else {
      item.stock = Math.max(0, item.stock - qty);
    }

    await item.save();
    await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

    await new movementModel({
      type:     "Inventory adjustment",
      item:     item._id,
      itemName: item.name,
      quantity: adjustType === "aumentar" ? qty : -qty,
      detail:   reason,
      user:     responsible,
      patient:  notes || null,
    }).save();

    return res.status(200).json({ message: "Ajuste realizado", item });
  } catch (error) {
    return res.status(500).json({ message: "Error al realizar ajuste", error: error.message });
  }
};

// ── POST entrada de stock ─────────────────────────────────────────────────────
inventoryController.stockEntry = async (req, res) => {
  try {
    const { name, category, unit_measure, supplier, quantity, unit_cost, detalle } = req.body;

    const qty  = Number(quantity);
    const cost = Number(unit_cost) || 0;

    // Buscar si ya existe por nombre
    let item = await inventoryModel.findOne({ name });

    if (item) {
      item.stock += qty;
      item.price  = cost;
      await item.save();
      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));
    } else {
      item = await new inventoryModel({
        name, category, unit_measure,
        stock: qty, min_stock: 5, price: cost, supplier,
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

// ── POST uso manual ───────────────────────────────────────────────────────────
inventoryController.manualUsage = async (req, res) => {
  try {
    const { responsible, reason, patient, items } = req.body;
    // items: [{ insumoId, quantity }]

    for (const entry of items) {
      const item = await inventoryModel.findById(entry.insumoId);
      if (!item) continue;

      item.stock     = Math.max(0, item.stock - Number(entry.quantity));
      item.last_used = new Date();
      await item.save();
      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

      await new movementModel({
        type:     "Manual use",
        item:     item._id,
        itemName: item.name,
        quantity: -Number(entry.quantity),
        detail:   reason,
        user:     responsible,
        patient:  patient || null,
      }).save();
    }

    return res.status(200).json({ message: "Uso manual registrado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar uso manual", error: error.message });
  }
};

// ── POST descontar desde procedimiento ───────────────────────────────────────
inventoryController.discountFromProcedure = async (req, res) => {
  try {
    const { patientName, responsible, procedureType, items } = req.body;
    // items: [{ insumoId, quantity }]

    for (const entry of items) {
      const item = await inventoryModel.findById(entry.insumoId);
      if (!item) continue;

      item.stock     = Math.max(0, item.stock - Number(entry.quantity));
      item.last_used = new Date();
      await item.save();
      await notifyLowStockAdmins(item).catch((error) => console.log("Error notificando inventario:", error));

      await new movementModel({
        type:     "Treatment use",
        item:     item._id,
        itemName: item.name,
        quantity: -Number(entry.quantity),
        detail:   `Procedimiento: ${procedureType}`,
        user:     responsible,
        patient:  patientName || null,
      }).save();
    }

    return res.status(200).json({ message: "Inventario descontado del procedimiento" });
  } catch (error) {
    return res.status(500).json({ message: "Error al descontar inventario", error: error.message });
  }
};

// ── GET datos para gráficas ───────────────────────────────────────────────────
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
