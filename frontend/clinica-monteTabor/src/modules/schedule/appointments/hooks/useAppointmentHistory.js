import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

function useAppointmentHistory(date, limit = 5) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient("/appointments/history", {
                params: { date, limit },
            });
            setHistory(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [date, limit]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return { history, isLoading, error, refetch: fetchHistory };
}

export default useAppointmentHistory;