import apiClient from "@/lib/apiClient";

const useAppointmentsApi = () => {
   // Obtiene el listado de citas filtrado por los parámetros recibidos.
    const getAppointments = (params = {}) => {
        return apiClient("/appointments", { params });
    };

    const getAppointmentsStats = (date) => {
        // Si date viene vacío o undefined, apiClient simplemente 
        // lo ignorará y no lo pondrá en la URL.
        return apiClient("/appointments/stats", { 
            params: { date } 
        });
    };

    const updateAppointmentStatus = (id, status, cancellation_reason) => {
        return apiClient(`/appointments/${id}/status`, {
            method: "PATCH",
            body: { status, cancellation_reason },
        });
    };

    return { getAppointments, getAppointmentsStats, updateAppointmentStatus };
};

export default useAppointmentsApi;
