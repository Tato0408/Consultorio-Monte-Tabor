import express, { Router } from "express";
import appointmentsController from "../../controllers/appointments/appointmentsController.js";

const router = express.Router();

router.route("/stats")
    .get(appointmentsController.getAppointmentsStats);

router.route("/history")
    .get(appointmentsController.getAppointmentsHistory);

router
    .get("/available-slots", appointmentsController.getAvailableSlots);

router.route("/")
    .get(appointmentsController.getAppointments)
    .post(appointmentsController.insertAppointment);

router.route("/:id")
    .get(appointmentsController.getAppointmentById)
    .put(appointmentsController.updateAppointment)
    .delete(appointmentsController.deleteAppointment);

router.route("/:id/status")
    .patch(appointmentsController.updateAppointmentStatus);

export default router;