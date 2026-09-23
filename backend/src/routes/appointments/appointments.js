import express, { Router } from "express";
import appointmentsController from "../../controllers/appointments/appointmentsController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Estas rutas comparten controlador con las de más abajo (getAppointments,
// insertAppointment), que sí exigen authorize("calendar.appointments", ...). No se les
// puede poner ese mismo middleware: el paciente no forma parte de la matriz de permisos
// del staff, authorize lo rechazaría siempre. Pero sin ningún chequeo, cualquier rol de
// staff autenticado (no solo "patient") podía golpear esta ruta directo y saltarse tanto
// el permiso real (calendar.appointments:view/create) como las restricciones que el
// propio controller aplica según el rol — dentro de insertAppointment, por ejemplo, solo
// "doctor" y "patient" reciben un override de campos, así que una enfermera o
// recepcionista podían mandar patient_id/doctor_id/total/status arbitrarios.
const requirePatientRole = (req, res, next) => {
    if (req.user?.role !== "patient") {
        return res.status(403).json({ message: "Esta ruta es exclusiva del portal de pacientes." });
    }
    next();
};

router.route("/stats")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentsStats);

router.route("/history")
    .get(authorize("calendar.appointments", "view"), appointmentsController.getAppointmentsHistory);

// Flujo de portal público: el controller limita los datos al paciente de la
// sesión. No usa la matriz interna de permisos destinada al personal.
router.route("/patient")
    .get(requirePatientRole, appointmentsController.getAppointments)
    .post(requirePatientRole, appointmentsController.insertAppointment);

router.get("/patient/procedures", requirePatientRole, appointmentsController.getPatientProcedures);
router.get("/nurses-for-acceptance", authorize("calendar.appointments", "view"), appointmentsController.getNursesForAcceptance);
router.get("/doctors-with-appointments", authorize("calendar.appointments", "view"), appointmentsController.getDoctorsWithAppointments);

router.route("/patient/:id")
    .get(requirePatientRole, appointmentsController.getPatientAppointmentById)
    .put(requirePatientRole, appointmentsController.updatePatientAppointment)
    .delete(requirePatientRole, appointmentsController.deleteMyAppointmentRequest);

router.route("/patient/:id/cancel")
    .patch(requirePatientRole, appointmentsController.cancelPatientAppointment);

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

// Mismo par de rutas de arriba, pero para citas de un procedimiento sin doctor
// (requires_doctor false), donde la enfermera es la proveedora principal.
router.route("/:id/accept-nurse")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.acceptAppointmentAsNurse);

router.route("/:id/assign-nurse")
    .patch(authorize("calendar.appointments", "update"), appointmentsController.assignNurse);

export default router;
