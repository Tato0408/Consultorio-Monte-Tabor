const BASE = "http://localhost:4000/api/nurse-schedule";

// Parsea la respuesta como JSON y lanza un error con el mensaje del
// servidor si la solicitud no fue exitosa.
const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

// Funciona igual que useSchedule.js pero gestiona el horario de una
// enfermera. No incluye getAvailableSlots porque esa función solo la
// usa el flujo de agendar citas de doctores.
const useNurseSchedule = () => {
    // Obtiene la configuración de horario guardada para la enfermera.
    const getSchedule = (nurseId) =>
        fetch(`${BASE}/${nurseId}`, { credentials: "include" }).then(handleResponse);

    // Guarda o reemplaza la configuración de horario de la enfermera.
    const saveSchedule = (nurseId, body) =>
        fetch(`${BASE}/${nurseId}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(handleResponse);

    return { getSchedule, saveSchedule };
};

export default useNurseSchedule;
