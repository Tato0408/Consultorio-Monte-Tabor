const BASE = "http://localhost:4000/api/appointment-types";

const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

// Catálogo global de tipos de cita (nombre y color), usado por todos
// los roles (la leyenda del calendario y el selector de tipo de cita
// al agendar). Solo el admin puede crear, editar o eliminar tipos, el
// backend valida ese permiso aparte, esto solo evita mostrar los
// botones a quien no puede usarlos.
const useAppointmentTypes = () => {
    const getAppointmentTypes = () =>
        fetch(BASE, { credentials: "include" }).then(handleResponse);

    const createAppointmentType = (body) =>
        fetch(BASE, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(handleResponse);

    const updateAppointmentType = (id, body) =>
        fetch(`${BASE}/${id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(handleResponse);

    const deleteAppointmentType = (id) =>
        fetch(`${BASE}/${id}`, { method: "DELETE", credentials: "include" }).then(handleResponse);

    return { getAppointmentTypes, createAppointmentType, updateAppointmentType, deleteAppointmentType };
};

export default useAppointmentTypes;
