import express from "express";
import reportsController from "../../controllers/reports/reportsController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.get("/appointments", authorize("reports.appointments", "view"), reportsController.getAppointmentsReport);
router.get("/patients", authorize("reports.patients", "view"), reportsController.getPatientsReport);
router.get("/doctors", authorize("reports.doctors", "view"), reportsController.getDoctorsReport);
router.get("/inventory", authorize("inventory.reports", "view"), reportsController.getInventoryReport);

export default router;
