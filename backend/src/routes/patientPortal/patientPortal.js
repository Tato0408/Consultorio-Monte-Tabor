import express from "express";
import patientPortalController from "../../controllers/patientPortal/patientPortalController.js";
import scheduleController from "../../controllers/schedule/scheduleController.js";

const router = express.Router();

// Catálogos que el paciente necesita para armar su cita
router.get("/doctors", patientPortalController.getDoctors);
// Solo doctores con horario ya configurado, para el paso "elegir doctor" del
// agendamiento (ver getSchedulableDoctors en el controller).
router.get("/doctors-schedulable", patientPortalController.getSchedulableDoctors);
router.get("/procedures", patientPortalController.getProcedures);

// Reutiliza el mismo cálculo de horarios libres que usa el
// personal de la clínica
router.get("/schedule/:doctorId/slots", scheduleController.getAvailableSlots);
// Días de la semana que el doctor atiende y sus excepciones de fecha, para
// bloquear en el calendario los días que no trabaja al elegir doctor primero.
router.get("/schedule/:doctorId/working-days", scheduleController.getDoctorWorkingDays);

// Citas del propio paciente
router.get("/appointments", patientPortalController.getMyAppointments);
router.post("/appointments", patientPortalController.bookAppointment);
router.patch("/appointments/:id/cancel", patientPortalController.cancelMyAppointment);

// Confirma, del lado del servidor y contra la propia API de Wompi,
// el pago en línea de una cita en estado "pending".
router.post("/appointments/:id/confirm-payment", patientPortalController.confirmAppointmentPayment);

// Panel principal: resumen con próxima cita, contadores, actividad
// y recordatorios
router.get("/dashboard", patientPortalController.getDashboardSummary);

// Recetas, incapacidades y referencias médicas del propio paciente.
// (El expediente clínico completo NO se expone aquí: solo lo ve el personal
// administrativo y los doctores desde el dashboard interno.)
router.get("/prescriptions", patientPortalController.getPrescriptions);
router.get("/sick-leaves", patientPortalController.getSickLeaves);
router.get("/referrals", patientPortalController.getReferrals);

// Medicamentos activos hoy y su registro de tomado/pendiente
router.get("/medications/today", patientPortalController.getTodayMedications);
router.patch("/medications/:medicationId/taken", patientPortalController.markMedicationTaken);

export default router;