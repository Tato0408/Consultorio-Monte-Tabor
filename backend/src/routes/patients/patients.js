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

// Editar/eliminar una toma puntual del historial de signos vitales (botón "Acción" de la tabla
// en la pestaña Signos vitales del Expediente) — a diferencia de PUT /:id, que solo agrega.
router.route("/:patientId/vital-signs/:vitalSignId")
  .put(authorize("users.patients", "update"), patientsController.updateVitalSign)
  .delete(authorize("users.patients", "delete"), patientsController.deleteVitalSign)

// Editar/eliminar un antecedente hereditario o patológico puntual (botones de la tabla de la
// pestaña Historia clínica del Expediente) — igual que vital-signs, PUT /:id de arriba solo agrega.
router.route("/:patientId/hereditary/:hereditaryId")
  .put(authorize("users.patients", "update"), patientsController.updateHereditary)
  .delete(authorize("users.patients", "delete"), patientsController.deleteHereditary)

router.route("/:patientId/pathological/:pathologicalId")
  .put(authorize("users.patients", "update"), patientsController.updatePathological)
  .delete(authorize("users.patients", "delete"), patientsController.deletePathological)

export default router