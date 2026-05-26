import patientsModel from "../../models/patients/patients.js"

//Array de funciones
const patientsController = {};

//Get de todos los pacientes
patientsController.getAllPatients = async (req, res) => {
    try {
        const patients = await patientsModel.find();
        return res.status(200).json(patients);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//Delete 
patientsController.deletePatient = async (req, res) => {
    try {
        //Buscamos el paciente por su id
        const deletedPatient = await patientsModel.findByIdAndDelete(req.params.id);
        //Si no coincide con ninguno entonces el paciente no existe
        if (!deletedPatient) {
            return res.status(400).json({ message: "Patient not found" });
        }
        //Si todo es correcto elimina el paciente
        return res.status(200).json({ message: "Patient deleted" })

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export default patientsController