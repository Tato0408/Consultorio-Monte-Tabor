import apiClient from "@/lib/apiClient";

// Funciona igual que useSchedule.js pero gestiona el horario de una
// enfermera. No incluye getAvailableSlots porque esa función solo la
// usa el flujo de agendar citas de doctores.
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

    return { getSchedule, saveSchedule };
};

export default useNurseSchedule;
