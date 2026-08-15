import { useCallback } from "react";

const BASE = "http://localhost:4000/api/nurse-dashboard";

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

// Agrupa las llamadas al API del dashboard de enfermería: estadísticas,
// agenda de doctores por fecha, próximas citas y confirmaciones
// pendientes. Cada función se envuelve en useCallback(..., []) para
// mantener la misma referencia entre renders. En
// useReceptionistDashboard.js se explica en detalle el problema que
// esto evita.
const useNurseDashboard = () => {
    const getStats = useCallback(() =>
        fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse), []);

    const getDoctorsAgenda = useCallback((date) =>
        fetch(`${BASE}/doctors-agenda?date=${date}`, { credentials: "include" }).then(handleResponse), []);

    const getUpcomingAppointments = useCallback(() =>
        fetch(`${BASE}/upcoming-appointments`, { credentials: "include" }).then(handleResponse), []);

    const getPendingConfirmations = useCallback(() =>
        fetch(`${BASE}/pending-confirmations`, { credentials: "include" }).then(handleResponse), []);

    return { getStats, getDoctorsAgenda, getUpcomingAppointments, getPendingConfirmations };
};

export default useNurseDashboard;
