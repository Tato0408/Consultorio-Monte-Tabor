import { useCallback } from "react";

const BASE = "http://localhost:4000/api/nurse-dashboard";

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
};

// Cada función se envuelve en useCallback(..., []) para que mantenga la MISMA referencia entre
// renders — ver useReceptionistDashboard.js para el detalle del bug que esto evita.
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
