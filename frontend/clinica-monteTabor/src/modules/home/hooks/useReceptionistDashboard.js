import { useCallback } from "react";

const BASE = "https://clinica-monte-tabor.onrender.com/api/receptionist-dashboard";

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

// Agrupa las llamadas al API del dashboard de recepción: estadísticas,
// agenda de doctores por fecha, próximas citas y confirmaciones
// pendientes. Cada función se envuelve en useCallback(..., []) para
// que mantenga la misma referencia entre renders. Sin esto, un
// componente que las use como dependencia de un useEffect o
// useCallback, como hace RecepcionistDashboard.jsx, entra en un ciclo
// infinito: la función cambia en cada render, el efecto se dispara de
// nuevo, se piden los datos otra vez, hay un nuevo render y la función
// vuelve a cambiar. Esto era lo que causaba que la agenda de doctores
// se quedara parpadeando en estado de carga sin asentarse nunca.
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
