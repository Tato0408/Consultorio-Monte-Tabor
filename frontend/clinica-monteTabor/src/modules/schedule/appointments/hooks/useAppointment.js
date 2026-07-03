import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/lib/apiClient";

// Hook central para todo lo relacionado a citas: lista paginada con filtros,
// traer una cita por id, crear/editar/eliminar, y cambiar solo el status.
// Lo usan tanto AppointmentsGrid (la lista de tarjetas) como AppointmentsForm
// (el detalle/creación/edición de una cita puntual).
function useAppointments(initialFilters = {}) {
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

    // Evita "race conditions": si el usuario cambia de filtro rápido,
    // solo nos importa la respuesta de la última petición disparada.
    const abortControllerRef = useRef(null);

    const fetchAppointments = useCallback(async () => {
        // Si ya había una petición en curso, la cancelamos antes de lanzar la
        // nueva. Ejemplo: si el usuario cambia de página varias veces
        // seguidas, no queremos que una respuesta vieja llegue después y
        // pise a la más reciente.
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
            // Si el error es porque nosotros mismos abortamos la petición
            // (AbortError), no es un error real que haya que mostrarle al
            // usuario, así que lo ignoramos.
            if (err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Se vuelve a pedir la lista cada vez que cambian los filtros (página,
    // status, etc.), porque fetchAppointments depende de "filters" y por
    // eso React genera una función nueva cuando estos cambian.
    useEffect(() => {
        fetchAppointments();
        return () => abortControllerRef.current?.abort();
    }, [fetchAppointments]);

    const getAppointmentById = useCallback(async (id) => {
        try {
            return await apiClient(`/appointments/${id}`);
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, []);

    const createAppointment = useCallback(async (appointment) => {
        try {
            setSubmitting(true);
            setError(null);

            const response = await apiClient("/appointments", {
                method: "POST",
                body: appointment,
            });

            // Refrescamos la lista para que la cita recién creada aparezca
            // sin que el usuario tenga que recargar la página manualmente.
            await fetchAppointments();

            return response && true;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [fetchAppointments]);

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

    const deleteAppointment = useCallback(async (id) => {
        try {
            setError(null);

            await apiClient(`/appointments/${id}`, {
                method: "DELETE",
            });

            setMessage("Cita eliminada correctamente");

            // Si acabamos de borrar la única cita de la página actual y no
            // estamos en la página 1, nos regresamos una página en vez de
            // quedar viendo una página vacía.
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

    // Cambia SOLO el status de una cita (ej. el botón "Cancelar" de la
    // tarjeta en AppointmentsGrid), sin tener que mandar el objeto completo
    // como hace updateAppointment. Además actualiza el estado local al toque
    // para que el cambio se vea de inmediato sin esperar un refetch de toda
    // la lista.
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
