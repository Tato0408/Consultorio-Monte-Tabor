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

export default router;