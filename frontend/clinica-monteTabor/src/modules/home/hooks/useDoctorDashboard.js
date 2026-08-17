import apiClient from "@/lib/apiClient";

// Valida la respuesta del fetch: si no fue exitosa, intenta leer el
// mensaje de error del cuerpo y lanza una excepción con ese mensaje.
// Si fue exitosa, devuelve el cuerpo ya parseado como JSON.
// Agrupa las llamadas al API del dashboard del doctor: estadísticas,
// calendario de citas por año, citas del día, historial de consultas
// y registros clínicos, y datos de analítica (enfermedades, tratamientos).
const useDoctorDashboard = () => {
    const getStats = () =>
        apiClient("/doctor-dashboard/stats");

    const getCalendar = (year) =>
        apiClient("/doctor-dashboard/calendar", { params: { year } });

    const getTodayAppointments = () =>
        apiClient("/doctor-dashboard/today-appointments");

    const getConsultationsAndRecords = () =>
        apiClient("/doctor-dashboard/consultations-records");

    const getAnalytics = () =>
        apiClient("/doctor-dashboard/analytics");

    return { getStats, getCalendar, getTodayAppointments, getConsultationsAndRecords, getAnalytics };
};

export default useDoctorDashboard;
