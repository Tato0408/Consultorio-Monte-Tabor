import apiClient from "@/lib/apiClient";

// Valida la respuesta del fetch: si no fue exitosa, intenta leer el
// mensaje de error del cuerpo y lanza una excepción con ese mensaje.
// Si fue exitosa, devuelve el cuerpo ya parseado como JSON.
// Agrupa las llamadas al API de dashboard administrativo: estadísticas
// generales, estado de doctores, estadísticas de usuarios y de reportes.
const useAdminDashboard = () => {
    const getStats = () =>
        apiClient("/dashboard/stats");

    const getDoctorStatus = () =>
        apiClient("/dashboard/doctor-status");

    const getUserStats = () =>
        apiClient("/dashboard/user-stats");

    const getReportStats = () =>
        apiClient("/dashboard/report-stats");

    return { getStats, getDoctorStatus, getUserStats, getReportStats };
};

export default useAdminDashboard;
