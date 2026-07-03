import express from "express";
import dashboardController from "../../controllers/dashboard/dashboardController.js";

const router = express.Router();

router.get("/stats", dashboardController.getStats);
router.get("/doctor-status", dashboardController.getDoctorStatus);
router.get("/user-stats", dashboardController.getUserStats);
router.get("/report-stats", dashboardController.getReportStats);

export default router;
