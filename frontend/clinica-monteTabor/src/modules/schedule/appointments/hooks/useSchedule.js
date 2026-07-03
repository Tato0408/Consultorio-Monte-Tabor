const BASE = "http://localhost:4000/api/schedule";

const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

const useSchedule = () => {
    const getSchedule = (doctorId) =>
        fetch(`${BASE}/${doctorId}`, { credentials: "include" }).then(handleResponse);

    const saveSchedule = (doctorId, body) =>
        fetch(`${BASE}/${doctorId}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(handleResponse);

    const getAvailableSlots = (doctorId, date, duration) =>
        fetch(`${BASE}/${doctorId}/slots?date=${date}&duration=${duration}`, {
            credentials: "include",
        }).then(handleResponse);

    return { getSchedule, saveSchedule, getAvailableSlots };
};

export default useSchedule;
