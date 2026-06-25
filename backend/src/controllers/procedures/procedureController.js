import proceduresModel from '../../models/procedures/procedures.js'

const proceduresController = {}

// GET — traer todos los procedimientos
proceduresController.getProcedures = async (req, res) => {
    try {
        const response = await proceduresModel.find()
            // Populate del ObjectId insumo trayendo solo el nombre del inventario
            .populate("materials.insumo", "name")

        if (!response) return res.status(400).json({ message: "Data not found" })
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" })
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
        return res.status(200).json({ message: "Data save", Data: savedProcedure })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

// UPDATE
proceduresController.updateProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findById(req.params.id)
        if (!response) return res.status(400).json({ message: "Data not found" })

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
        return res.status(200).json({ message: "Data updated", Data: procedureUpdate })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

// DELETE
proceduresController.deleteProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findByIdAndDelete(req.params.id)
        if (!response) return res.status(400).json({ message: "Data not found" })
        return res.status(200).json({ message: "Data deleted" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export default proceduresController