const BASE = "http://localhost:4000/api/appointments";

const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error en la solicitud");
    return data;
};

export const getAppointments = (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""));
    const q = new URLSearchParams(clean).toString();
    return fetch(`${BASE}?${q}`, { credentials: "include" }).then(handleResponse);
};

export const getAppointmentsStats = (date) => {
    const q = date ? `?date=${date}` : "";
    return fetch(`${BASE}/stats${q}`, { credentials: "include" }).then(handleResponse);
};

export const updateAppointmentStatus = (id, status, cancellation_reason) =>
    fetch(`${BASE}/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, cancellation_reason }),
    }).then(handleResponse);
