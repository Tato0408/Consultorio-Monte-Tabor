import proceduresModel from '../../models/procedures/procedures.js'

const proceduresController = {}

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