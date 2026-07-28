import express, { Router } from "express";
import appointmentsController from "../../controllers/appointments/appointmentsController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.route("/stats")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentsStats);

router.route("/history")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentsHistory);

router
    .get("/available-slots", authorize("calendar.appointments", "view"), appointmentsController.getAvailableSlots);

router.route("/")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointments)
    .post(authorize("calendar.appointments", "create"), appointmentsController.insertAppointment);

router.route("/:id")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentById)
    .put(authorize("calendar.appointments", "update"), appointmentsController.updateAppointment)
    .delete(authorize("calendar.appointments", "delete"), appointmentsController.deleteAppointment);

router.route("/:id/status")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.updateAppointmentStatus);

export default router;