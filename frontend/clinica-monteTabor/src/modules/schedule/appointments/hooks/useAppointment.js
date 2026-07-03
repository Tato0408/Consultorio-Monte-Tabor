import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/lib/apiClient";

// Contiene la lógica de datos de citas: listado paginado con filtros,
// consulta por id, creación, edición, eliminación y cambio de status.
function useAppointments(initialFilters = {}) {
    // Filtros y paginación del listado.
    const [filters, setFilters] = useState({
        page: 1,
        limit: 9,
        ...initialFilters,
    });

    const [appointments, setAppointments] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 9,
        total: 0,
        totalPages: 1,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState(null);
    const [message, setMessage] = useState("");

    // Referencia a la petición en curso, para poder cancelarla.
    const abortControllerRef = useRef(null);

    // Trae el listado de citas según los filtros actuales.
    const fetchAppointments = useCallback(async () => {
        // Cancela la petición anterior si seguía en curso.
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
            // Un AbortError es una cancelación propia, no un error real.
            if (err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Refetch automático cada vez que cambian los filtros.
    useEffect(() => {
        fetchAppointments();
        return () => abortControllerRef.current?.abort();
    }, [fetchAppointments]);

    // Trae una cita puntual por id.
    const getAppointmentById = useCallback(async (id) => {
        try {
            return await apiClient(`/appointments/${id}`);
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, []);

    // Crea una cita y refresca el listado.
    const createAppointment = useCallback(async (appointment) => {
        try {
            setSubmitting(true);
            setError(null);

            const response = await apiClient("/appointments", {
                method: "POST",
                body: appointment,
            });

            await fetchAppointments();

            return response && true;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [fetchAppointments]);

    // Actualiza una cita existente y refresca el listado.
    const updateAppointment = useCallback(async (id, appointment) => {
        try {
            setSubmitting(true);
            setError(null);

            const response = await apiClient(`/appointments/${id}`, {
                method: "PUT",
                body: appointment,
            });

            setMessage("Cita actualizada correctamente");

            await fetchAppointments();

            return response;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [fetchAppointments]);

    // Elimina una cita. Si era la única de la página actual, retrocede una página.
    const deleteAppointment = useCallback(async (id) => {
        try {
            setError(null);

            await apiClient(`/appointments/${id}`, {
                method: "DELETE",
            });

            setMessage("Cita eliminada correctamente");

            const nextPage =
                appointments.length === 1 && pagination.page > 1
                    ? pagination.page - 1
                    : pagination.page;

            if (nextPage !== pagination.page) {
                setFilters((prev) => ({
                    ...prev,
                    page: nextPage,
                }));
            } else {
                await fetchAppointments();
            }

            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [appointments.length, pagination.page, fetchAppointments]);

    // Combina nuevos filtros con los actuales. Resetea a página 1 salvo que
    // el cambio incluya explícitamente una página.
    const updateFilters = useCallback((newFilters) => {
        setFilters((prev) => ({
            ...prev,
            ...newFilters,
            page: newFilters.page ?? 1,
        }));
    }, []);

    // Cambia solo la página actual.
    const goToPage = useCallback((page) => {
        setFilters((prev) => ({ ...prev, page }));
    }, []);

    // Cambia únicamente el status de una cita (PATCH) y actualiza la lista
    // local sin esperar un refetch completo.
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
        filters,

        isLoading,
        submitting,

        error,
        message,

        fetchAppointments,
        getAppointmentById,
        createAppointment,
        updateAppointment,
        deleteAppointment,

        updateStatus,

        updateFilters,
        goToPage,
    };
}

export default useAppointments;
