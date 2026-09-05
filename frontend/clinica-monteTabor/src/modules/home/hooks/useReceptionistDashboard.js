import { useCallback } from "react";
import apiClient from "@/lib/apiClient";

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
        apiClient("/receptionist-dashboard/stats"), []);

    const getDoctorsAgenda = useCallback((date, duration) =>
        apiClient("/receptionist-dashboard/doctors-agenda", { params: { date, duration } }), []);

    const getNursesAgenda = useCallback((date, duration) =>
        apiClient("/receptionist-dashboard/nurses-agenda", { params: { date, duration } }), []);

    const getUpcomingAppointments = useCallback(() =>
        apiClient("/receptionist-dashboard/upcoming-appointments"), []);

    const getPendingConfirmations = useCallback(() =>
        apiClient("/receptionist-dashboard/pending-confirmations"), []);

    return { getStats, getDoctorsAgenda, getNursesAgenda, getUpcomingAppointments, getPendingConfirmations };
};

export default useReceptionistDashboard;
