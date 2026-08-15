import nurse_notesModel from "../../models/nurse_notes/nurse_notes.js";

const nurse_notesController = {}

// Devuelve todas las notas de enfermería con los datos de la cita, la
// enfermera y el paciente asociados.
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

// Crea una nota de enfermería a partir de los datos del body (cita,
// enfermera, paciente e instrucciones).
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
        res.json({message: "Dato guardado", data: payload})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message, data: req.body });
    }
}

// Actualiza una nota de enfermería según su id, recibido en
// req.params.id. Responde con error 400 si la nota no existe.
nurse_notesController.updateNurseNote = async (req, res) => {
    try {
        const response = await nurse_notesModel.findById(req.params.id)
        if(!response) return res.status(400).json({ message: "Dato no encontrado" })
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
        res.json({message: "Dato actualizado", data: nurse_noteUpdated});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Elimina una nota de enfermería según su id, recibido en
// req.params.id. Responde con error 400 si la nota no existe.
nurse_notesController.deleteNurseNote = async (req, res) => {
    try {
        const response = await nurse_notesModel.findById(req.params.id)
        if(!response) return res.status(400).json({ message: "Dato no encontrado" })
        const nurse_noteDeleted = await nurse_notesModel.findByIdAndDelete(req.params.id)
        res.json({message: "Dato eliminado", data: nurse_noteDeleted});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export default nurse_notesController;