import express from "express"
import patientsController from "../../controllers/patients/patientsController.js"

const router = express.Router();

//endpoint http://localhost:4000/api/patients
router.route("/").get(patientsController.getAllPatients)


router.route("/:id").delete(patientsController.deletePatient).put(patientsController.updatePatient)

export default router