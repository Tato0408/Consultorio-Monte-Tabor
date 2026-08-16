const BASE = "https://clinica-monte-tabor.onrender.com/api/dashboard";

// Valida la respuesta del fetch: si no fue exitosa, intenta leer el
// mensaje de error del cuerpo y lanza una excepción con ese mensaje.
// Si fue exitosa, devuelve el cuerpo ya parseado como JSON.
const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
};

// Agrupa las llamadas al API de dashboard administrativo: estadísticas
// generales, estado de doctores, estadísticas de usuarios y de reportes.
const useAdminDashboard = () => {
    const getStats = () =>
        fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

    const getDoctorStatus = () =>
        fetch(`${BASE}/doctor-status`, { credentials: "include" }).then(handleResponse);

    const getUserStats = () =>
        fetch(`${BASE}/user-stats`, { credentials: "include" }).then(handleResponse);

    const getReportStats = () =>
        fetch(`${BASE}/report-stats`, { credentials: "include" }).then(handleResponse);

    return { getStats, getDoctorStatus, getUserStats, getReportStats };
};

export default useAdminDashboard;
