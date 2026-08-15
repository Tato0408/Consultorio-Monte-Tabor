const BASE = "http://localhost:4000/api/doctor-dashboard";

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

// Agrupa las llamadas al API del dashboard del doctor: estadísticas,
// calendario de citas por año, citas del día, historial de consultas
// y registros clínicos, y datos de analítica (enfermedades, tratamientos).
const useDoctorDashboard = () => {
    const getStats = () =>
        fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

    const getCalendar = (year) =>
        fetch(`${BASE}/calendar?year=${year}`, { credentials: "include" }).then(handleResponse);

    const getTodayAppointments = () =>
        fetch(`${BASE}/today-appointments`, { credentials: "include" }).then(handleResponse);

    const getConsultationsAndRecords = () =>
        fetch(`${BASE}/consultations-records`, { credentials: "include" }).then(handleResponse);

    const getAnalytics = () =>
        fetch(`${BASE}/analytics`, { credentials: "include" }).then(handleResponse);

    return { getStats, getCalendar, getTodayAppointments, getConsultationsAndRecords, getAnalytics };
};

export default useDoctorDashboard;
