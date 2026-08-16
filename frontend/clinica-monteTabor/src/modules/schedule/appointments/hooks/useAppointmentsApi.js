const BASE = "https://clinica-monte-tabor.onrender.com/api/appointments";

// Parsea la respuesta como JSON y lanza un error con el mensaje del
// servidor si la solicitud no fue exitosa.
const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

const useAppointmentsApi = () => {
    // Obtiene el listado de citas filtrado por los parámetros recibidos,
    // descartando los valores nulos o vacíos antes de armar la query.
    const getAppointments = (params = {}) => {
        const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""));
        const q = new URLSearchParams(clean).toString();
        return fetch(`${BASE}?${q}`, { credentials: "include" }).then(handleResponse);
    };

    const getAppointmentsStats = (date) => {
        const q = date ? `?date=${date}` : "";
        return fetch(`${BASE}/stats${q}`, { credentials: "include" }).then(handleResponse);
    };

    const updateAppointmentStatus = (id, status, cancellation_reason) =>
        fetch(`${BASE}/${id}/status`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, cancellation_reason }),
        }).then(handleResponse);

    return { getAppointments, getAppointmentsStats, updateAppointmentStatus };
};

export default useAppointmentsApi;
