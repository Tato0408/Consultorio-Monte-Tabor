import apiClient from "@/lib/apiClient";

// Llamadas al portal del paciente que no son de agendamiento (ver appointmentsService.js para eso)

export const getDashboardSummary = () => apiClient("/patient-portal/dashboard");

export const getPrescriptions = () => apiClient("/patient-portal/prescriptions");

export const getLabOrders = () => apiClient("/patient-portal/lab-orders");

export const getSickLeaves = () => apiClient("/patient-portal/sick-leaves");

export const getReferrals = () => apiClient("/patient-portal/referrals");

export const getTodayMedications = () => apiClient("/patient-portal/medications/today");

export const markMedicationTaken = (medicationId, taken) =>
  apiClient(`/patient-portal/medications/${medicationId}/taken`, { method: "PATCH", body: { taken } });