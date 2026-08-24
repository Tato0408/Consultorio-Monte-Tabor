import appointmentTypeModel from "../../models/appointmentTypes/appointmentType.js";
import { escapeRegex } from "../../utils/validators.js";

const appointmentTypesController = {};
const VALID_CATEGORIES = ["consulta", "procedimiento", "ambos"];

// Evita dos tipos con el mismo nombre (insensible a mayúsculas y
// espacios), mismo criterio que procedimientos e inventario.
// excludeId se pasa al editar, para no chocar contra sí mismo.
const findDuplicateName = async (name, excludeId) => {
    const normalized = String(name || "").trim();
    if (!normalized) return null;
    const found = await appointmentTypeModel.findOne({
        name: new RegExp(`^${escapeRegex(normalized)}$`, "i"),
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    return found ? "Ya existe un tipo de cita con ese nombre" : null;
};

// GET, lectura abierta a cualquier rol autenticado (leyenda del
// calendario, selector al agendar).
appointmentTypesController.getAll = async (req, res) => {
    try {
        const types = await appointmentTypeModel.find().sort({ name: 1 });
        return res.status(200).json(types);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los tipos de cita" });
    }
};

appointmentTypesController.create = async (req, res) => {
    try {
        const { name, color, category } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: "El nombre es requerido" });
        }
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: "Categoría de tipo de cita inválida" });
        }

        const duplicateError = await findDuplicateName(name);
        if (duplicateError) return res.status(400).json({ message: duplicateError });

        const created = await new appointmentTypeModel({
            name: String(name).trim(),
            color: color || undefined,
            category: category || undefined,
        }).save();

        return res.status(201).json(created);
    } catch (error) {
        return res.status(500).json({ message: "Error al crear el tipo de cita" });
    }
};

appointmentTypesController.update = async (req, res) => {
    try {
        const { name, color, category } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: "El nombre es requerido" });
        }
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: "Categoría de tipo de cita inválida" });
        }

        const duplicateError = await findDuplicateName(name, req.params.id);
        if (duplicateError) return res.status(400).json({ message: duplicateError });

        const updated = await appointmentTypeModel.findByIdAndUpdate(
            req.params.id,
            { name: String(name).trim(), color, ...(category ? { category } : {}) },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Tipo de cita no encontrado" });

        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar el tipo de cita" });
    }
};

appointmentTypesController.remove = async (req, res) => {
    try {
        const deleted = await appointmentTypeModel.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Tipo de cita no encontrado" });

        return res.status(200).json({ message: "Tipo de cita eliminado" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el tipo de cita" });
    }
};

export default appointmentTypesController;
