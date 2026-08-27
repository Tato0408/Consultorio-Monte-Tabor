import apiClient from "@/lib/apiClient";

// Funciona igual que useSchedule.js pero gestiona el horario de una
// enfermera. getAvailableSlots se usa cuando un procedimiento no requiere
// doctor (requires_doctor false): ahí la enfermera es la proveedora
// principal de la cita, con el mismo flujo de horarios que un doctor.
const useNurseSchedule = () => {
    // Obtiene la configuración de horario guardada para la enfermera.
    const getSchedule = (nurseId) =>
        apiClient(`/nurse-schedule/${nurseId}`);

    // Guarda o reemplaza la configuración de horario de la enfermera.
    const saveSchedule = (nurseId, body) =>
        apiClient(`/nurse-schedule/${nurseId}`, {
            method: "PUT",
            body,
        });

    // Obtiene los bloques horarios disponibles de la enfermera para una
    // fecha y duración de cita determinadas.
    const getAvailableSlots = (nurseId, date, duration) =>
        apiClient(`/nurse-schedule/${nurseId}/slots`, {
            params: { date, duration },
        });

    return { getSchedule, saveSchedule, getAvailableSlots };
};

export default useNurseSchedule;
