import express from "express"
import patientsController from "../../controllers/patients/patientsController.js"
import { authorize, authorizeAny } from "../../middlewares/authorizeMiddleware.js"

const router = express.Router();

router.route("/")
  .get(authorize("users.patients", "view"), patientsController.getAllPatients)
  .post(authorize("users.patients", "create"), patientsController.createPatient)

router.route("/:id")
  .delete(authorize("users.patients", "delete"), patientsController.deletePatient)
  // PUT /:id lo usan tanto la gestion de usuarios (datos personales) como el
  // expediente clinico (datos personales y campos del historial clinico), asi
  // que basta con tener actualizacion en cualquiera de los dos modulos. Si el
  // cuerpo trae campos del historial clinico, updatePatient exige ademas el
  // permiso del expediente (ver el controlador).
  .put(authorizeAny(["users.patients", "update"], ["reports.records", "update"]), patientsController.updatePatient)

// Edita o elimina un registro puntual del historial de signos
// vitales (botón "Acción" de la tabla, pestaña Signos vitales del
// Expediente). Solo se llega aqui desde el expediente, asi que se controla
// con el permiso de ese modulo, no con el de gestion de pacientes.
router.route("/:patientId/vital-signs/:vitalSignId")
  .put(authorize("reports.records", "update"), patientsController.updateVitalSign)
  .delete(authorize("reports.records", "delete"), patientsController.deleteVitalSign)

// Edita o elimina un antecedente hereditario o patológico puntual
// (botones de la tabla, pestaña Historia clínica del Expediente).
router.route("/:patientId/hereditary/:hereditaryId")
  .put(authorize("reports.records", "update"), patientsController.updateHereditary)
  .delete(authorize("reports.records", "delete"), patientsController.deleteHereditary)

router.route("/:patientId/pathological/:pathologicalId")
  .put(authorize("reports.records", "update"), patientsController.updatePathological)
  .delete(authorize("reports.records", "delete"), patientsController.deletePathological)

// Elimina un procedimiento puntual del historial clínico (botón de
// la tabla, pestaña Procedimientos del Expediente).
router.route("/:patientId/procedures/:procedureEntryId")
  .delete(authorize("reports.records", "delete"), patientsController.deleteProcedureHistory)

export default router