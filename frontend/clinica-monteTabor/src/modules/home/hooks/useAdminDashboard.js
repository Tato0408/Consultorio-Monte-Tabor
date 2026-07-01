const BASE = "http://localhost:4000/api/dashboard";

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
};

const useAdminDashboard = () => {
    const getStats = () =>
        fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

    const getDoctorStatus = () =>
        fetch(`${BASE}/doctor-status`, { credentials: "include" }).then(handleResponse);

    const getUserStats = () =>
        fetch(`${BASE}/user-stats`, { credentials: "include" }).then(handleResponse);

    const getReportStats = () =>
        fetch(`${BASE}/report-stats`, { credentials: "include" }).then(handleResponse);

    return { getStats, getDoctorStatus, getUserStats, getReportStats };
};

export default useAdminDashboard;
