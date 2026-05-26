import express, { Router } from "express";
import appointmentsController from "../controllers/appointmentsController.js";

const router = express.Router();

router.route("/")
    .get(appointmentsController.getAppointments)
    .post(appointmentsController.insertAppointment);

router.route("/:id")
    .put(appointmentsController.updateAppointment)
    .delete(appointmentsController.deleteAppointment);

export default router;