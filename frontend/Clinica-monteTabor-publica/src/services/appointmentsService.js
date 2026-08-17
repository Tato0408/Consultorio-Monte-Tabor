import apiClient from "@/lib/apiClient";

// Todas estas llamadas requieren que el paciente tenga sesión iniciada
// (endpoints bajo /api/patient-portal en el backend)

export const getDoctors = () => apiClient("/patient-portal/doctors");

export const getProcedures = () => apiClient("/patient-portal/procedures");

export const getAvailableSlots = (doctorId, date, duration) =>
  apiClient(`/patient-portal/schedule/${doctorId}/slots`, { params: { date, duration } });

// Horarios agregados entre todos los doctores para una fecha y tipo de
// atención, sin revelar qué doctor los cubre: el paciente solo elige el
// horario, el servidor le asigna un doctor disponible al aceptar la solicitud.
export const getPatientAvailableSlots = (date, procedureId) =>
  apiClient("/schedule/patient-available-slots", { params: { date, procedure_id: procedureId } });

// No se manda doctor_id: el servidor notifica a todos los doctores libres en ese
// horario y la cita queda "pending" hasta que alguno la acepte.
export const bookAppointment = (data) =>
  apiClient("/patient-portal/appointments", { method: "POST", body: data });

export const getMyAppointments = () => apiClient("/patient-portal/appointments");

export const cancelAppointment = (id) =>
  apiClient(`/patient-portal/appointments/${id}/cancel`, { method: "PATCH" });

// Confirma (contra la propia API de Wompi, del lado del servidor) que la transacción ya cobrada
// realmente fue aprobada, y recién ahí pasa la cita de "pending" a "scheduled"
export const confirmPayment = (appointmentId, transactionId) =>
  apiClient(`/patient-portal/appointments/${appointmentId}/confirm-payment`, {
    method: "POST",
    body: { transactionId },
  });