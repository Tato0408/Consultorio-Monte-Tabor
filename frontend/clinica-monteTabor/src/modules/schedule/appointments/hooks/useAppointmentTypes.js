import apiClient from "@/lib/apiClient";

// Catálogo global de tipos de cita (nombre y color), usado por todos
// los roles (la leyenda del calendario y el selector de tipo de cita
// al agendar). Solo el admin puede crear, editar o eliminar tipos, el
// backend valida ese permiso aparte, esto solo evita mostrar los
// botones a quien no puede usarlos.
const useAppointmentTypes = () => {
    const getAppointmentTypes = () =>
        apiClient("/appointment-types");

    const createAppointmentType = (body) =>
        apiClient("/appointment-types", {
            method: "POST",
            body
        });

    const updateAppointmentType = (id, body) =>
        apiClient(`/appointment-types/${id}`, {
            method: "PUT",
            body
        });

    const deleteAppointmentType = (id) =>
        apiClient(`/appointment-types/${id}`, {
            method: "DELETE"
        });

    return { getAppointmentTypes, createAppointmentType, updateAppointmentType, deleteAppointmentType };
};

export default useAppointmentTypes;
