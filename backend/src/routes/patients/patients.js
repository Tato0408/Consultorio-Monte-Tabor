import express from "express"
import patientsController from "../../controllers/patients/patientsController.js"
import { authorize } from "../../middlewares/authorizeMiddleware.js"

const router = express.Router();

router.route("/")
  .get(authorize("users.patients", "view"), patientsController.getAllPatients)
  .post(authorize("users.patients", "create"), patientsController.createPatient)

router.route("/:id")
  .delete(authorize("users.patients", "delete"), patientsController.deletePatient)
  .put(authorize("users.patients", "update"), patientsController.updatePatient)

// Edita o elimina un registro puntual del historial de signos
// vitales (botón "Acción" de la tabla, pestaña Signos vitales del
// Expediente). A diferencia de PUT /:id, que solo agrega registros,
// esta ruta modifica uno existente.
router.route("/:patientId/vital-signs/:vitalSignId")
  .put(authorize("users.patients", "update"), patientsController.updateVitalSign)
  .delete(authorize("users.patients", "delete"), patientsController.deleteVitalSign)

// Edita o elimina un antecedente hereditario o patológico puntual
// (botones de la tabla, pestaña Historia clínica del Expediente).
// Igual que en vital-signs, PUT /:id de arriba solo agrega registros.
router.route("/:patientId/hereditary/:hereditaryId")
  .put(authorize("users.patients", "update"), patientsController.updateHereditary)
  .delete(authorize("users.patients", "delete"), patientsController.deleteHereditary)

router.route("/:patientId/pathological/:pathologicalId")
  .put(authorize("users.patients", "update"), patientsController.updatePathological)
  .delete(authorize("users.patients", "delete"), patientsController.deletePathological)

export default router