import express from "express"
import consultationController from "../../controllers/consultations/consultation.js"

const router = express.Router();

router.route("/by-appointment/:appointmentId")
    .get(consultationController.getConsultationByAppointmentId);

router.route("/")
    .get(consultationController.getConsultations)
    .post(consultationController.insertConsultation);

router.route("/:id")
    .put(consultationController.updateConsultation)
    .delete(consultationController.deleteConsultation)
    .get(consultationController.getConsultationById);

export default router;