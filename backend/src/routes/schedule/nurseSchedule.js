import express from "express";
import nurseScheduleController from "../../controllers/schedule/nurseScheduleController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.route("/:nurseId")
    .get(authorize("calendar.schedule", "view"), nurseScheduleController.getSchedule)
    .put(authorize("calendar.schedule", "update"), nurseScheduleController.saveSchedule);

export default router;
