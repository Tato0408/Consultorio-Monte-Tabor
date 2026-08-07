import { useCallback } from "react";

const BASE = "http://localhost:4000/api/receptionist-dashboard";

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
};

// Cada función se envuelve en useCallback(..., []) para que mantenga la MISMA referencia entre
// renders. Sin esto, un componente que las use como dependencia de un useEffect/useCallback
// (como hace RecepcionistDashboard.jsx) entra en un ciclo infinito: la función "cambia" en cada
// render → el efecto se dispara de nuevo → pide los datos otra vez → nuevo render → la función
// "cambia" de nuevo... Esto es justo lo que causaba que la agenda de doctores se quedara
// parpadeando en "cargando" sin asentarse nunca.
const useReceptionistDashboard = () => {
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

export default useReceptionistDashboard;
