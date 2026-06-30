import express from "express";
import scheduleController from "../../controllers/schedule/scheduleController.js";

const router = express.Router();

router.route("/:doctorId/slots")
    .get(scheduleController.getAvailableSlots);

router.route("/:doctorId")
    .get(scheduleController.getSchedule)
    .put(scheduleController.saveSchedule);

export default router;
