import express from "express"
import consultationController from "../../controllers/consultations/consultation.js"
import { authorize, authorizeAll } from "../../middlewares/authorizeMiddleware.js"

const router = express.Router();

router.route("/by-appointment/:appointmentId")
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultationByAppointmentId)
    .delete(authorize("calendar.consultations", "delete"), consultationController.deleteConsultationByAppointment);

router.route("/")
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultations)
    .post(authorize("calendar.consultations", "create"), consultationController.insertConsultation);

router.route("/:id")
    // Editar una consulta ya registrada exige poder crear y actualizar en el
    // modulo de consultas (misma regla que el boton "Finalizar y guardar" del
    // formulario, que solo funciona con ambos permisos).
    .put(authorizeAll(["calendar.consultations", "create"], ["calendar.consultations", "update"]), consultationController.updateConsultation)
    .delete(authorize("calendar.consultations", "delete"), consultationController.deleteConsultation)
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultationById);

// Nota de enfermería de una consulta. La escribe solo la enfermera asignada
// a la cita (el controller valida el rol y la pertenencia), por eso basta
// con el permiso de ver consultas: el doctor nunca pasa por acá.
router.route("/:id/nurse-note")
    .patch(authorize("calendar.consultations", "view"), consultationController.setNurseNote);

// Edición/eliminación puntual de la referencia de una consulta, desde la
// pestaña de Documentos del expediente (reports.records), no desde el flujo
// de atención de la consulta (calendar.consultations).
router.route("/:id/referral")
    .put(authorize("reports.records", "update"), consultationController.updateReferral)
    .delete(authorize("reports.records", "delete"), consultationController.deleteReferral);

export default router;