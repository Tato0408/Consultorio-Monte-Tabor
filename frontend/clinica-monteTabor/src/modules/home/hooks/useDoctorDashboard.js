const BASE = "http://localhost:4000/api/doctor-dashboard";

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
};

const useDoctorDashboard = () => {
    const getStats = () =>
        fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

    const getCalendar = (year) =>
        fetch(`${BASE}/calendar?year=${year}`, { credentials: "include" }).then(handleResponse);

    const getTodayAppointments = () =>
        fetch(`${BASE}/today-appointments`, { credentials: "include" }).then(handleResponse);

    const getConsultationsAndRecords = () =>
        fetch(`${BASE}/consultations-records`, { credentials: "include" }).then(handleResponse);

    const getAnalytics = () =>
        fetch(`${BASE}/analytics`, { credentials: "include" }).then(handleResponse);

    return { getStats, getCalendar, getTodayAppointments, getConsultationsAndRecords, getAnalytics };
};

export default useDoctorDashboard;
