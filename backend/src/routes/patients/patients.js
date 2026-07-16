import express from "express"
import patientsController from "../../controllers/patients/patientsController.js"
import { authorize } from "../../middlewares/authorizeMiddleware.js"

const router = express.Router();

//endpoint http://localhost:4000/api/patients
router.route("/")
  .get(authorize("users.patients", "view"), patientsController.getAllPatients)
  .post(authorize("users.patients", "create"), patientsController.createPatient)

router.route("/:id")
  .delete(authorize("users.patients", "delete"), patientsController.deletePatient)
  .put(authorize("users.patients", "update"), patientsController.updatePatient)

export default router