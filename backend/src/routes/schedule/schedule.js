import express from "express";
import scheduleController from "../../controllers/schedule/scheduleController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.route("/:doctorId/slots")
    .get(authorize("calendar.schedule", "view"), scheduleController.getAvailableSlots);

router.route("/:doctorId")
    .get(authorize("calendar.schedule", "view"), scheduleController.getSchedule)
    .put(authorize("calendar.schedule", "update"), scheduleController.saveSchedule);

export default router;
