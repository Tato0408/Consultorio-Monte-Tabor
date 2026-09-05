import { useCallback } from "react";

import apiClient from "@/lib/apiClient";

// Valida la respuesta del fetch: si no fue exitosa, intenta leer el
// mensaje de error del cuerpo y lanza una excepción con ese mensaje.
// Si fue exitosa, devuelve el cuerpo ya parseado como JSON.
// Agrupa las llamadas al API del dashboard de enfermería: estadísticas,
// agenda de doctores por fecha, próximas citas y confirmaciones
// pendientes. Cada función se envuelve en useCallback(..., []) para
// mantener la misma referencia entre renders. En
// useReceptionistDashboard.js se explica en detalle el problema que
// esto evita.
const useNurseDashboard = () => {
    const getStats = useCallback(() =>
        apiClient("/nurse-dashboard/stats"), []);

    const getDoctorsAgenda = useCallback((date, duration) =>
        apiClient("/nurse-dashboard/doctors-agenda", { params: { date, duration } }), []);

    const getNursesAgenda = useCallback((date, duration) =>
        apiClient("/nurse-dashboard/nurses-agenda", { params: { date, duration } }), []);

    const getUpcomingAppointments = useCallback(() =>
        apiClient("/nurse-dashboard/upcoming-appointments"), []);

    const getPendingConfirmations = useCallback(() =>
        apiClient("/nurse-dashboard/pending-confirmations"), []);

    return { getStats, getDoctorsAgenda, getNursesAgenda, getUpcomingAppointments, getPendingConfirmations };
};

export default useNurseDashboard;
