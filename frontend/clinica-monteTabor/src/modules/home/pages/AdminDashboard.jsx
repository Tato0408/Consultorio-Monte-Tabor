import { useEffect, useState } from "react";
import { DollarSign, Users, CalendarDays, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAdminDashboard from "../hooks/useAdminDashboard";
import StatCard from "../components/StatCard";
import UserManagementSection from "../components/UserManagementSection";
import ReportStatsSection from "../components/ReportStatsSection";
import TodayAgendaSection from "../components/TodayAgendaSection";
import QuickActionsSection from "../components/QuickActionsSection";
import SystemStatusSection from "../components/SystemStatusSection";
import DashboardWelcomeHeader from "../components/DashboardWelcomeHeader";

const fmtRevenue = (n) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
    return `$${n.toLocaleString()}`;
};

const AdminDashboard = () => {
    const { user } = useAuth();
    const { getStats, getDoctorStatus, getUserStats, getReportStats } = useAdminDashboard();

    const [stats,        setStats]        = useState(null);
    const [doctorStatus, setDoctorStatus] = useState(null);
    const [userStats,    setUserStats]    = useState(null);
    const [reportStats,  setReportStats]  = useState(null);
    const [loading,      setLoading]      = useState(true);
    // Alimenta el panel "Estado del sistema": healthy solo es true si las 4 llamadas de arriba
    // terminaron sin error, y loadedAt es el momento real en que se cargaron (no decorativo).
    const [dataHealthy,  setDataHealthy]  = useState(true);
    const [loadedAt,     setLoadedAt]     = useState(null);

    useEffect(() => {
        Promise.allSettled([
            getStats(),
            getDoctorStatus(),
            getUserStats(),
            getReportStats(),
        ]).then((results) => {
            const [s, d, u, r] = results;
            if (s.status === "fulfilled") setStats(s.value);
            if (d.status === "fulfilled") setDoctorStatus(d.value);
            if (u.status === "fulfilled") setUserStats(u.value);
            if (r.status === "fulfilled") setReportStats(r.value);
            setDataHealthy(results.every((res) => res.status === "fulfilled"));
            setLoadedAt(new Date());
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
        <div className="bg-slate-50 min-h-screen">
            <DashboardWelcomeHeader
                displayName={displayName}
                subtitle="Aquí tienes un resumen de tus consultas"
                user={user}
                userType="admin"
            />

            <div className="relative p-4 sm:p-6 pt-3 flex flex-col gap-8">

                {/* ── Resumen general: ingresos como métrica principal destacada ── */}
                <section>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                        Resumen general
                    </h2>
                    {/* grid-cols-5: la card de ingresos ocupa 2 columnas (más ancha/horizontal,
                        como en la referencia) y las otras 3 ocupan 1 cada una — 2+1+1+1=5, así
                        las 4 caben siempre en una sola fila sin que ninguna se desborde a la
                        siguiente línea. */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <StatCard
                            featured
                            icon={<DollarSign className="w-5 h-5 text-white" />}
                            label="Total de ingresos"
                            value={fmtRevenue(s.revenue?.total ?? 0)}
                            caption="Pagos en línea confirmados"
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

                {/* ── Columna izquierda (usuarios + reportes) y barra lateral derecha
                        (agenda, accesos rápidos, estado del sistema) como una sola columna
                        continua de cards cuadradas/uniformes, no filas separadas ── */}
                <section className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
                    <div className="lg:col-span-3 flex flex-col gap-8">
                        <UserManagementSection data={userStats} />
                        <ReportStatsSection data={reportStats} />
                    </div>
                    <div className="flex flex-col gap-5">
                        <TodayAgendaSection
                            counts={doctorStatus?.counts}
                            appointments={doctorStatus?.schedule}
                        />
                        <QuickActionsSection />
                        <SystemStatusSection healthy={dataHealthy} updatedAt={loadedAt} />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;
