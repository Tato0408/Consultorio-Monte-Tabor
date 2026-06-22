import proceduresModel from '../../models/procedures/procedures.js'

const proceduresController = {}

proceduresController.getProcedures = async (req, res) => {
    try {
        const response = await proceduresModel.find()
        if(!response) return res.status(400).json({message: "Data not found"})
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

proceduresController.insertProcedure = async (req,res) => {
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

        const payload = new proceduresModel({
            name,
            description,
            estimated_duration,
            price,
            materials,
            post_operative_instructions,
            requires_nurse,
            is_active
        })

        const savedProcedure = await payload.save()
        
        return res.status(200).json({messgae: "Data save", Data: savedProcedure})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

proceduresController.updateProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findById(req.params.id)
        if(!response) return res.status(400).json({message: "Data not found"})
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
        
        const payload = {
            name,
            description,
            estimated_duration,
            price,
            materials,
            post_operative_instructions,
            requires_nurse,
            is_active : response.is_active
        }

        const procedureUpdate = await proceduresModel.findByIdAndUpdate(req.params.id, payload, { new: true })
        return res.status(200).json({message: "Data updated", Data: procedureUpdate})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

proceduresController.deleteProcedure = async (req, res) => {
    try {
        const response = await proceduresModel.findByIdAndDelete(req.params.id)
        if(!response) return res.status(400).json({message: "Data not found"})
        return res.status(200).json({message: "Data deleted"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export default proceduresController