import inventoryModel from "../../models/inventory/inventory.js";
import movimientoModel from "../../models/inventory/movements.js";
import { v2 as cloudinary } from "cloudinary";

const inventoryController = {};

// ── GET todos (paginación + filtros) ──────────────────────────────────────────
inventoryController.getInsumos = async (req, res) => {
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
    const insumos = await inventoryModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      insumos,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    return res.status(500).json({ message: "Error interno", error: error.message });
  }
};

// ── GET por ID ────────────────────────────────────────────────────────────────
inventoryController.getInsumoById = async (req, res) => {
  try {
    const insumo = await inventoryModel.findById(req.params.id);
    if (!insumo) return res.status(404).json({ message: "Insumo no encontrado" });
    return res.status(200).json(insumo);
  } catch (error) {
    return res.status(500).json({ message: "Error interno" });
  }
};

// ── POST crear insumo ─────────────────────────────────────────────────────────
inventoryController.createInsumo = async (req, res) => {
  try {
    const {
      name, description, category, stock, unit_measure,
      price, min_stock, expiration_date, supplier,
    } = req.body;

    const newInsumo = new inventoryModel({
      name, description, category,
      stock:     Number(stock),
      unit_measure,
      price:     Number(price) || 0,
      min_stock: Number(min_stock) || 5,
      expiration_date, supplier,
    });

    if (req.file) {
      newInsumo.image = req.file.path;
      newInsumo.image_public_id = req.file.filename;
    }

    await newInsumo.save();

    // Registrar movimiento inicial en colección separada
    if (Number(stock) > 0) {
      await new movimientoModel({
        tipo:         "Entrada de stock",
        insumo:       newInsumo._id,
        nombreInsumo: name,
        cantidad:     Number(stock),
        detalle:      "Stock inicial al crear producto",
        usuario:      "Admin. Sistema",
      }).save();
    }

    return res.status(201).json({ message: "Insumo creado exitosamente", insumo: newInsumo });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear insumo", error: error.message });
  }
};

// ── PUT actualizar insumo ─────────────────────────────────────────────────────
inventoryController.updateInsumo = async (req, res) => {
  try {
    const { id } = req.params;
    const insumo = await inventoryModel.findById(id);
    if (!insumo) return res.status(404).json({ message: "Insumo no encontrado" });

    const updateData = { ...req.body };
    if (updateData.stock)     updateData.stock     = Number(updateData.stock);
    if (updateData.price)     updateData.price     = Number(updateData.price);
    if (updateData.min_stock) updateData.min_stock = Number(updateData.min_stock);

    if (req.file) {
      if (insumo.image_public_id) {
        await cloudinary.uploader.destroy(insumo.image_public_id);
      }
      updateData.image = req.file.path;
      updateData.image_public_id = req.file.filename;
    }

    const updated = await inventoryModel.findByIdAndUpdate(id, updateData, { new: true });
    return res.status(200).json({ message: "Insumo actualizado", insumo: updated });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar", error: error.message });
  }
};

// ── DELETE eliminar insumo ────────────────────────────────────────────────────
inventoryController.deleteInsumo = async (req, res) => {
  try {
    const insumo = await inventoryModel.findById(req.params.id);
    if (!insumo) return res.status(404).json({ message: "Insumo no encontrado" });

    if (insumo.image_public_id) {
      await cloudinary.uploader.destroy(insumo.image_public_id);
    }

    await inventoryModel.findByIdAndDelete(req.params.id);
    // Eliminar también sus movimientos
    await movimientoModel.deleteMany({ insumo: req.params.id });

    return res.status(200).json({ message: "Insumo eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar" });
  }
};

// ── GET estadísticas dashboard ────────────────────────────────────────────────
inventoryController.getStats = async (req, res) => {
  try {
    const total = await inventoryModel.countDocuments();

    const bajoStock = await inventoryModel.countDocuments({
      $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }] },
    });

    const critico = await inventoryModel.countDocuments({ stock: { $lte: 0 } });

    const valorResult = await inventoryModel.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ["$stock", "$price"] } } } },
    ]);
    const valorTotal = valorResult[0]?.total || 0;

    const hoy = new Date();
    const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    const proximosAVencer = await inventoryModel
      .find({ expiration_date: { $gte: hoy, $lte: en30Dias } })
      .sort({ expiration_date: 1 })
      .limit(3)
      .select("name expiration_date unit_measure");

    const alertas = await inventoryModel
      .find({
        $or: [
          { stock: { $lte: 0 } },
          { $expr: { $lte: ["$stock", "$min_stock"] } },
        ],
      })
      .sort({ stock: 1 })
      .limit(5)
      .select("name stock min_stock unit_measure");

    return res.status(200).json({ total, bajoStock, critico, valorTotal, proximosAVencer, alertas });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// ── GET movimientos recientes (colección separada) ────────────────────────────
inventoryController.getMovimientos = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const movimientos = await movimientoModel
      .find()
      .populate("insumo", "name unit_measure")
      .sort({ fecha: -1 })
      .limit(Number(limit));

    return res.status(200).json(movimientos);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener movimientos" });
  }
};

// ── POST ajuste de inventario ─────────────────────────────────────────────────
inventoryController.ajusteInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, adjustType, reason, responsible, notes } = req.body;

    const insumo = await inventoryModel.findById(id);
    if (!insumo) return res.status(404).json({ message: "Insumo no encontrado" });

    const qty = Number(quantity);
    if (adjustType === "aumentar") {
      insumo.stock += qty;
    } else {
      insumo.stock = Math.max(0, insumo.stock - qty);
    }

    await insumo.save();

    await new movimientoModel({
      tipo:         "Ajuste de inventario",
      insumo:       insumo._id,
      nombreInsumo: insumo.name,
      cantidad:     adjustType === "aumentar" ? qty : -qty,
      detalle:      reason,
      usuario:      responsible,
      paciente:     notes || null,
    }).save();

    return res.status(200).json({ message: "Ajuste realizado", insumo });
  } catch (error) {
    return res.status(500).json({ message: "Error al realizar ajuste", error: error.message });
  }
};

// ── POST entrada de stock ─────────────────────────────────────────────────────
inventoryController.entradaStock = async (req, res) => {
  try {
    const {
      name, category, unit_measure, supplier,
      quantity, unit_cost, detalle,
    } = req.body;

    const qty  = Number(quantity);
    const cost = Number(unit_cost) || 0;

    let insumo = await inventoryModel.findOne({ name });

    if (insumo) {
      insumo.stock += qty;
      insumo.price  = cost;
      await insumo.save();
    } else {
      insumo = await new inventoryModel({
        name, category, unit_measure,
        stock: qty, min_stock: 5, price: cost, supplier,
      }).save();
    }

    await new movimientoModel({
      tipo:         "Entrada de stock",
      insumo:       insumo._id,
      nombreInsumo: insumo.name,
      cantidad:     qty,
      detalle:      detalle || `Compra a ${supplier || "proveedor"}`,
      usuario:      "Admin. Sistema",
    }).save();

    return res.status(200).json({ message: "Entrada de stock registrada", insumo });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar entrada", error: error.message });
  }
};

// ── POST uso manual ───────────────────────────────────────────────────────────
inventoryController.usoManual = async (req, res) => {
  try {
    const { responsible, reason, patient, items } = req.body;
    // items: [{ insumoId, quantity }]

    for (const item of items) {
      const insumo = await inventoryModel.findById(item.insumoId);
      if (!insumo) continue;

      insumo.stock     = Math.max(0, insumo.stock - Number(item.quantity));
      insumo.last_used = new Date();
      await insumo.save();

      await new movimientoModel({
        tipo:         "Uso manual",
        insumo:       insumo._id,
        nombreInsumo: insumo.name,
        cantidad:     -Number(item.quantity),
        detalle:      reason,
        usuario:      responsible,
        paciente:     patient || null,
      }).save();
    }

    return res.status(200).json({ message: "Uso manual registrado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar uso manual", error: error.message });
  }
};

export default inventoryController;
