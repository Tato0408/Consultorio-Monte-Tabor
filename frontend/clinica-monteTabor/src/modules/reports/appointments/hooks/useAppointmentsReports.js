import useReportData from "../../useReportData";

// Antes era una copia carácter por carácter de useReportData con el endpoint fijo en
// /reports/appointments: cualquier fix a la lógica de fechas/validación había que
// aplicarlo dos veces o se desincronizaba. Mismo criterio que useInventoryReports.js,
// useDoctorReports.js y usePatientsReports.js.
const useAppointmentsReports = () => useReportData("/reports/appointments");

export default useAppointmentsReports;
