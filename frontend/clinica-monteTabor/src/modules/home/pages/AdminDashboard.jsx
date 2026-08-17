import { useEffect, useState } from "react";
import { DollarSign, Users, CalendarDays, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAdminDashboard from "../hooks/useAdminDashboard";
import StatCard from "../components/StatCard";
import UserManagementSection from "../components/UserManagementSection";
import ReportStatsSection from "../components/ReportStatsSection";
import TodayAgendaSection from "../components/TodayAgendaSection";
import QuickActionsSection from "../components/QuickActionsSection";
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

                {/* Resumen general: ingresos como métrica principal destacada */}
                <section>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                        Resumen general
                    </h2>
                    {/* La clase grid-cols-5 hace que la tarjeta de ingresos ocupe dos
                        columnas, más ancha y horizontal como en el diseño de referencia,
                        y que las otras tres ocupen una columna cada una. Entre las
                        cuatro tarjetas suman las cinco columnas de la grilla, así que
                        siempre caben en una sola fila sin desbordarse a la siguiente
                        línea. */}
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

                {/* Columna izquierda (usuarios y reportes) y barra lateral derecha
                    (agenda y accesos rápidos). No usa items-start, así que ambas
                    columnas se estiran a la altura de la más alta, que suele ser la
                    izquierda. Dentro de la derecha, Agenda del día y Accesos rápidos
                    reciben cada una flex-1, el mismo factor, para quedar exactamente
                    mitad y mitad, en vez de que una tome su alto natural y la otra
                    absorba el resto sola. El min-h-0 en ambos contenedores es
                    necesario para que puedan encogerse por debajo de su alto de
                    contenido, ya que sin eso flex nunca las dejaría bajar de ese
                    tamaño y la mitad y mitad dejaría de cumplirse. */}
                <section className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="lg:col-span-3 flex flex-col gap-8">
                        <UserManagementSection data={userStats} />
                        <ReportStatsSection data={reportStats} />
                    </div>
                    <div className="flex flex-col gap-5">
                        <div className="flex-1 min-h-0">
                            <TodayAgendaSection
                                counts={doctorStatus?.counts}
                                appointments={doctorStatus?.schedule}
                            />
                        </div>
                        <div className="flex-1 min-h-0">
                            <QuickActionsSection />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;
