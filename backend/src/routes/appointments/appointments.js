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

// Flujo de portal público: el controller limita los datos al paciente de la
// sesión. No usa la matriz interna de permisos destinada al personal.
router.route("/patient")
    .get(appointmentsController.getAppointments)
    .post(appointmentsController.insertAppointment);

router.get("/patient/procedures", appointmentsController.getPatientProcedures);
router.get("/nurses-for-acceptance", authorize("calendar.appointments", "view"), appointmentsController.getNursesForAcceptance);
router.get("/doctors-with-appointments", authorize("calendar.appointments", "view"), appointmentsController.getDoctorsWithAppointments);

router.route("/patient/:id")
    .get(appointmentsController.getPatientAppointmentById)
    .put(appointmentsController.updatePatientAppointment);

router.route("/patient/:id/cancel")
    .patch(appointmentsController.cancelPatientAppointment);

router.route("/")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointments)
    .post(authorize("calendar.appointments", "create"), appointmentsController.insertAppointment);

router.route("/:id")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentById)
    .put(authorize("calendar.appointments", "update"), appointmentsController.updateAppointment)
    .delete(authorize("calendar.appointments", "delete"), appointmentsController.deleteAppointment);

router.route("/:id/status")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.updateAppointmentStatus);

router.route("/:id/accept")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.acceptAppointment);

router.route("/:id/assign")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.assignDoctor);

export default router;
