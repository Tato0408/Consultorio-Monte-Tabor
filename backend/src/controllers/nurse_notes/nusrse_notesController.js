import nurse_notesModel from "../../models/nurse_notes/nurse_notes.js";

const nurse_notesController = {}

nurse_notesController.getNurseNotes = async (req, res) => {
    try {
        const nurseNotes = await nurse_notesModel.find()
        .populate('appointment_id')
        .populate('nurse_id')
        .populate('patient_id');
        res.json(nurseNotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

nurse_notesController.createNurseNote = async (req, res) => {
    try {
        const {
            appointment_id,
            nurse_id,
            patient_id,
            instructions
        } = req.body;

        const payload = new nurse_notesModel({
            appointment_id,
            nurse_id,
            patient_id,
            instructions
        })
        await payload.save()
        res.json({message: "Data save", data: payload})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message, data: req.body });
    }
}

nurse_notesController.updateNurseNote = async (req, res) => {
    try {
        const response = await nurse_notesModel.findById(req.params.id)
        if(!response) return res.status(400).json({ message: 'Data not found' })
        const {
            appointment_id,
            nurse_id,
            patient_id,
            instructions
        } = req.body;

        const payload = {
            appointment_id,
            nurse_id,
            patient_id,
            instructions
        }
        const nurse_noteUpdated = await nurse_notesModel.findByIdAndUpdate(req.params.id, payload)
        res.json({message: "Data updated", data: nurse_noteUpdated});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

nurse_notesController.deleteNurseNote = async (req, res) => {
    try {
        const response = await nurse_notesModel.findById(req.params.id)
        if(!response) return res.status(400).json({ message: 'Data not found' })
        const nurse_noteDeleted = await nurse_notesModel.findByIdAndDelete(req.params.id)
        res.json({message: "Data deleted", data: nurse_noteDeleted});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export default nurse_notesController;