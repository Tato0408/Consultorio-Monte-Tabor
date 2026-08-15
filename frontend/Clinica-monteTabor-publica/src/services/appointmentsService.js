import apiClient from "@/lib/apiClient";

// Todas estas llamadas requieren que el paciente tenga sesión iniciada
// (endpoints bajo /api/patient-portal en el backend)

export const getDoctors = () => apiClient("/patient-portal/doctors");

export const getProcedures = () => apiClient("/patient-portal/procedures");

export const getAvailableSlots = (doctorId, date, duration) =>
  apiClient(`/patient-portal/schedule/${doctorId}/slots`, { params: { date, duration } });

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