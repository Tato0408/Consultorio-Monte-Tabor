import express from "express"
import consultationController from "../../controllers/consultations/consultation.js"
import { authorize } from "../../middlewares/authorizeMiddleware.js"

const router = express.Router();

router.route("/by-appointment/:appointmentId")
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultationByAppointmentId);

router.route("/")
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultations)
    .post(authorize("calendar.consultations", "create"), consultationController.insertConsultation);

router.route("/:id")
    .put(authorize("calendar.consultations", "update"), consultationController.updateConsultation)
    .delete(authorize("calendar.consultations", "delete"), consultationController.deleteConsultation)
    .get(authorize("calendar.consultations", "view"), consultationController.getConsultationById);

// Edición/eliminación puntual de la referencia de una consulta, desde la
// pestaña de Documentos del expediente (reports.records), no desde el flujo
// de atención de la consulta (calendar.consultations).
router.route("/:id/referral")
    .put(authorize("reports.records", "update"), consultationController.updateReferral)
    .delete(authorize("reports.records", "delete"), consultationController.deleteReferral);

export default router;