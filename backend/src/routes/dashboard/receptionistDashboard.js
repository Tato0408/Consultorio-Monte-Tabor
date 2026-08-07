import express from "express";
import receptionistDashboardController from "../../controllers/dashboard/receptionistDashboardController.js";

const router = express.Router();

router.get("/stats", receptionistDashboardController.getStats);
router.get("/doctors-agenda", receptionistDashboardController.getDoctorsAgenda);
router.get("/upcoming-appointments", receptionistDashboardController.getUpcomingAppointments);
router.get("/pending-confirmations", receptionistDashboardController.getPendingConfirmations);

export default router;
