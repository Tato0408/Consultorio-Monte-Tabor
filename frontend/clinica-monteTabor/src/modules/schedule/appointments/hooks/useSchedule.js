import apiClient from "@/lib/apiClient";

const useSchedule = () => {
    // Obtiene la configuración de horario guardada para el médico.
    const getSchedule = (doctorId) =>
        apiClient(`/schedule/${doctorId}`);

    // Guarda o reemplaza la configuración de horario del médico.
    const saveSchedule = (doctorId, body) =>
        apiClient(`/schedule/${doctorId}`, {
            method: "PUT",
            body,
        });

    // Obtiene los bloques horarios disponibles del médico para una
    // fecha y duración de cita determinadas.
    const getAvailableSlots = (doctorId, date, duration) =>
        apiClient(`/schedule/${doctorId}/slots`, {
            params: { date, duration },
        });

    return { getSchedule, saveSchedule, getAvailableSlots };
};

export default useSchedule;
