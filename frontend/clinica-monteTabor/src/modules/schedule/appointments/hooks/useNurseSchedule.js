const BASE = "http://localhost:4000/api/nurse-schedule";

const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

// Igual que useSchedule.js pero para el horario de una enfermera (sin getAvailableSlots: eso
// solo lo necesita el flujo de agendar citas de doctores).
const useNurseSchedule = () => {
    const getSchedule = (nurseId) =>
        fetch(`${BASE}/${nurseId}`, { credentials: "include" }).then(handleResponse);

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
