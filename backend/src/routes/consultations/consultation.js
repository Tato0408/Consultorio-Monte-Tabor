import express from "express"
import consultationController from "../../controllers/consultations/consultation.js"

const router = express.Router();

router.route("/").get(consultationController.getConsultations).post(consultationController.insertConsultation);
router.route("/:id").post(consultationController.updateConsultation).delete(consultationController.deleteConsultation);

export default router;