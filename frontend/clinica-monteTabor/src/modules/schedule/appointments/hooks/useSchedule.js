const BASE = "https://clinica-monte-tabor.onrender.com/api/schedule";

// Parsea la respuesta como JSON y lanza un error con el mensaje del
// servidor si la solicitud no fue exitosa.
const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

const useSchedule = () => {
    // Obtiene la configuración de horario guardada para el médico.
    const getSchedule = (doctorId) =>
        fetch(`${BASE}/${doctorId}`, { credentials: "include" }).then(handleResponse);

    // Guarda o reemplaza la configuración de horario del médico.
    const saveSchedule = (doctorId, body) =>
        fetch(`${BASE}/${doctorId}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(handleResponse);

    // Obtiene los bloques horarios disponibles del médico para una
    // fecha y duración de cita determinadas.
    const getAvailableSlots = (doctorId, date, duration) =>
        fetch(`${BASE}/${doctorId}/slots?date=${date}&duration=${duration}`, {
            credentials: "include",
        }).then(handleResponse);

    return { getSchedule, saveSchedule, getAvailableSlots };
};

export default useSchedule;
