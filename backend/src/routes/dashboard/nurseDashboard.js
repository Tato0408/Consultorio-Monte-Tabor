import express from "express";
import nurseDashboardController from "../../controllers/dashboard/nurseDashboardController.js";

const router = express.Router();

router.get("/stats", nurseDashboardController.getStats);
router.get("/doctors-agenda", nurseDashboardController.getDoctorsAgenda);
router.get("/upcoming-appointments", nurseDashboardController.getUpcomingAppointments);
router.get("/pending-confirmations", nurseDashboardController.getPendingConfirmations);

export default router;
