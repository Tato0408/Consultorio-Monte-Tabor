import { useEffect, useState } from "react";
import { DollarSign, Users, CalendarDays, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAdminDashboard from "../hooks/useAdminDashboard";
import StatCard from "../components/StatCard";
import DoctorStatusSection from "../components/DoctorStatusSection";
import UserManagementSection from "../components/UserManagementSection";
import ReportStatsSection from "../components/ReportStatsSection";
import SystemControlSection from "../components/SystemControlSection";

const fmtRevenue = (n) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
    return `$${n.toLocaleString()}`;
};

const todayLabel = () =>
    new Date().toLocaleDateString("es-SV", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const AdminDashboard = () => {
    const { user } = useAuth();
    const { getStats, getDoctorStatus, getUserStats, getReportStats } = useAdminDashboard();

    const [stats,        setStats]        = useState(null);
    const [doctorStatus, setDoctorStatus] = useState(null);
    const [userStats,    setUserStats]    = useState(null);
    const [reportStats,  setReportStats]  = useState(null);
    const [loading,      setLoading]      = useState(true);

    useEffect(() => {
        Promise.allSettled([
            getStats(),
            getDoctorStatus(),
            getUserStats(),
            getReportStats(),
        ]).then(([s, d, u, r]) => {
            if (s.status === "fulfilled") setStats(s.value);
            if (d.status === "fulfilled") setDoctorStatus(d.value);
            if (u.status === "fulfilled") setUserStats(u.value);
            if (r.status === "fulfilled") setReportStats(r.value);
        }).finally(() => setLoading(false));
    }, []);

    const displayName = user
        ? `${user.name || ""} ${user.last_name || ""}`.trim() || user.email
        : "Administrador";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    const s = stats || {};

    return (
        <div className="p-6 bg-slate-50 min-h-screen flex flex-col gap-6">

            {/* ── Header ──────────────────────────────────────── */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">
                    ¡Bienvenido, {displayName}!
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Aquí tienes un resumen de tus consultas
                </p>
            </div>

            {/* ── Resumen general ─────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                        Resumen general
                    </h2>
                    <span className="text-xs text-slate-400">Hoy, {todayLabel()}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-100"
                        label="Total de ingresos"
                        value={fmtRevenue(s.revenue?.total ?? 0)}
                        growth={`${s.revenue?.growth ?? 0}%`}
                        growthLabel="vs. mes pasado"
                        sparkline={s.revenue?.sparkline ?? []}
                        sparklineColor="#3b82f6"
                    />
                    <StatCard
                        icon={<UserCheck className="w-5 h-5 text-cyan-600" />}
                        iconBg="bg-cyan-100"
                        label="Doctores activos"
                        value={s.activeDoctors?.count ?? 0}
                        growth={`+${s.activeDoctors?.vsYesterday ?? 0}`}
                        growthLabel="vs. ayer"
                        sparkline={s.activeDoctors?.sparkline ?? []}
                        sparklineColor="#06b6d4"
                    />
                    <StatCard
                        icon={<CalendarDays className="w-5 h-5 text-violet-600" />}
                        iconBg="bg-violet-100"
                        label="Citas hoy"
                        value={s.appointmentsToday?.count ?? 0}
                        growth={`${(s.appointmentsToday?.vsYesterday ?? 0) >= 0 ? "+" : ""}${s.appointmentsToday?.vsYesterday ?? 0}`}
                        growthLabel="vs. ayer"
                        sparkline={s.appointmentsToday?.sparkline ?? []}
                        sparklineColor="#7c3aed"
                    />
                    <StatCard
                        icon={<Users className="w-5 h-5 text-pink-600" />}
                        iconBg="bg-pink-100"
                        label="Pacientes registrados"
                        value={(s.totalPatients?.count ?? 0).toLocaleString()}
                        growth={`${s.totalPatients?.growth ?? 0}%`}
                        growthLabel="vs. mes pasado"
                        sparkline={s.totalPatients?.sparkline ?? []}
                        sparklineColor="#ec4899"
                    />
                </div>
            </section>

            {/* ── Estado de doctores ──────────────────────────── */}
            <DoctorStatusSection data={doctorStatus} />

            {/* ── Gestión de usuarios ─────────────────────────── */}
            <UserManagementSection data={userStats} />

            {/* ── Reportes y estadísticas ─────────────────────── */}
            <ReportStatsSection data={reportStats} />

            {/* ── Control total del sistema ───────────────────── */}
            <SystemControlSection />
        </div>
    );
};

export default AdminDashboard;
