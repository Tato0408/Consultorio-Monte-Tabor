import proceduresModel from '../../models/procedures/procedures.js'
import { getNonNegativeError, escapeRegex } from '../../utils/validators.js'

const proceduresController = {}

// Evita procedimientos duplicados (mismo nombre, sin importar mayúsculas/espacios extra) — dos
// procedimientos con el mismo nombre confunden cualquier selector que los liste (ProcedureModal,
// AppointmentsForm, ProceduresForm). excludeId se pasa al editar, para no chocar contra sí mismo.
const findDuplicateProcedureName = async (name, excludeId) => {
    const normalized = String(name || '').trim()
    if (!normalized) return null
    const found = await proceduresModel.findOne({
        name: new RegExp(`^${escapeRegex(normalized)}$`, 'i'),
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    return found ? 'Ya existe un procedimiento registrado con ese nombre' : null
}

// Valida precio, duración y cantidad de materiales de un procedimiento — mismas reglas que ya
// exige el frontend (ProceduresForm.jsx / ProcedureModal.jsx), repetidas aquí porque el backend
// nunca debe confiar solo en que el cliente ya validó.
const getProcedureError = ({ price, estimated_duration, materials }) => {
    const priceError = getNonNegativeError(price, "El precio")
    if (priceError) return priceError

    if (estimated_duration !== undefined && estimated_duration !== null && estimated_duration !== "") {
        const duration = Number(estimated_duration)
        if (Number.isNaN(duration)) return "La duración estimada debe ser un número"
        if (duration <= 0) return "La duración estimada debe ser mayor a 0"
    }

    for (const material of materials || []) {
        if (material.quantity === undefined || material.quantity === null || material.quantity === "") continue
        const quantity = Number(material.quantity)
        if (Number.isNaN(quantity)) return "La cantidad de un material debe ser un número"
        if (quantity < 1) return "La cantidad de un material debe ser al menos 1"
    }

    return null
}

// GET — traer todos los procedimientos
proceduresController.getProcedures = async (req, res) => {
    try {
        const response = await proceduresModel.find()
            // Populate del ObjectId insumo trayendo solo el nombre del inventario
            .populate("materials.insumo", "name")

        if (!response) return res.status(400).json({ message: "Dato no encontrado" })
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// INSERT
proceduresController.insertProcedure = async (req, res) => {
    try {
        const {
            name,
            description,
            estimated_duration,
            price,
            materials,
            post_operative_instructions,
            requires_nurse,
            is_active
        } = req.body

        const procedureError = getProcedureError({ price, estimated_duration, materials })
        if (procedureError) return res.status(400).json({ message: procedureError })

        const duplicateError = await findDuplicateProcedureName(name)
        if (duplicateError) return res.status(400).json({ message: duplicateError })

        // Limpiar materiales — quitar _id que pueda venir del frontend
        // y asegurar que cada material tenga name como String
        const cleanMaterials = (materials || []).map(({ _id, ...rest }) => ({
            name:     rest.name     || "",
            quantity: rest.quantity || 1,
            // insumo solo si viene como ObjectId válido
            ...(rest.insumo ? { insumo: rest.insumo } : {})
        }))

        const payload = new proceduresModel({
            name,
            description,
            estimated_duration,
            price,
            materials: cleanMaterials,
            post_operative_instructions,
            requires_nurse,
            is_active
        })

        const savedProcedure = await payload.save()
        return res.status(200).json({ message: "Dato guardado", Data: savedProcedure })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// UPDATE
proceduresController.updateProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findById(req.params.id)
        if (!response) return res.status(400).json({ message: "Dato no encontrado" })

        const {
            name,
            description,
            estimated_duration,
            price,
            materials,
            post_operative_instructions,
            requires_nurse,
            is_active
        } = req.body

        const procedureError = getProcedureError({ price, estimated_duration, materials })
        if (procedureError) return res.status(400).json({ message: procedureError })

        const duplicateError = await findDuplicateProcedureName(name, req.params.id)
        if (duplicateError) return res.status(400).json({ message: duplicateError })

        // Limpiar _id de subdocumentos que Mongoose genera automáticamente
        // al devolver el documento — si los mandamos de vuelta causan CastError
        const cleanMaterials = (materials || []).map(({ _id, ...rest }) => ({
            name:     rest.name     || "",
            quantity: rest.quantity || 1,
            ...(rest.insumo ? { insumo: rest.insumo } : {})
        }))

        const payload = {
            name,
            description,
            estimated_duration,
            price,
            materials: cleanMaterials,
            post_operative_instructions,
            requires_nurse,
            is_active
        }

        const procedureUpdate = await proceduresModel.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true }
        )
        return res.status(200).json({ message: "Dato actualizado", Data: procedureUpdate })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

// DELETE
proceduresController.deleteProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findByIdAndDelete(req.params.id)
        if (!response) return res.status(400).json({ message: "Dato no encontrado" })
        return res.status(200).json({ message: "Dato eliminado" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
}

export default proceduresController