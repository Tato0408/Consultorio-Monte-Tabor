import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/lib/apiClient";

function useAppointments(initialFilters = {}) {
    const [filters, setFilters] = useState({
        page: 1,
        limit: 8,
        ...initialFilters,
    });
 
    const [appointments, setAppointments] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
 
    // Evita "race conditions": si el usuario cambia de filtro rápido,
    // solo nos importa la respuesta de la última petición disparada.
    const abortControllerRef = useRef(null);
 
    const fetchAppointments = useCallback(async () => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
 
        setIsLoading(true);
        setError(null);
 
        try {
            const response = await apiClient("/appointments", {
                params: filters,
                signal: controller.signal,
            });
            setAppointments(response.data);
            setPagination(response.pagination);
        } catch (err) {
            if (err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [filters]);
 
    useEffect(() => {
        fetchAppointments();
        return () => abortControllerRef.current?.abort();
    }, [fetchAppointments]);
 
    // Actualiza uno o varios filtros a la vez; resetea a página 1
    // salvo que el cambio sea explícitamente de página.
    const updateFilters = useCallback((newFilters) => {
        setFilters((prev) => ({
            ...prev,
            ...newFilters,
            page: newFilters.page ?? 1,
        }));
    }, []);
 
    const goToPage = useCallback((page) => {
        setFilters((prev) => ({ ...prev, page }));
    }, []);
 
    // Cambia el estado de una cita (ej. botón "Continuar" -> completed)
    // y refresca la lista local sin esperar un refetch completo.
    const updateStatus = useCallback(async (appointmentId, status, extra = {}) => {
        await apiClient(`/appointments/${appointmentId}/status`, {
            method: "PATCH",
            body: { status, ...extra },
        });
        setAppointments((prev) =>
            prev.map((appt) => (appt._id === appointmentId ? { ...appt, status } : appt))
        );
    }, []);
 
    return {
        appointments,
        pagination,
        isLoading,
        error,
        filters,
        updateFilters,
        goToPage,
        updateStatus,
        refetch: fetchAppointments,
    };
}
 
export default useAppointments;
