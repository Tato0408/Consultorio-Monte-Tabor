import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Obtiene las estadísticas de citas (agendadas, en espera, completadas y
// próxima cita) para la fecha indicada. Devuelve las estadísticas, el
// estado de carga, el error y una función para volver a solicitar los
// datos.
function useAppointmentStats(date) {
    const [stats, setStats] = useState({
        scheduled: 0,
        waiting: 0,
        completed: 0,
        nextAppointment: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient("/appointments/stats", {
                params: { date },
            });
            setStats(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, isLoading, error, refetch: fetchStats };
}

export default useAppointmentStats;