import express from "express";
import doctorDashboardController from "../../controllers/dashboard/doctorDashboardController.js";

const router = express.Router();

router.get("/stats",                 doctorDashboardController.getStats);
router.get("/calendar",              doctorDashboardController.getCalendar);
router.get("/today-appointments",    doctorDashboardController.getTodayAppointments);
router.get("/consultations-records", doctorDashboardController.getConsultationsAndRecords);
router.get("/analytics",             doctorDashboardController.getAnalytics);

export default router;
