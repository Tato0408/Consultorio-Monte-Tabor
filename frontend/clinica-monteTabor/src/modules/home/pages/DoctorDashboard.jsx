import { useEffect, useState } from "react";
import { Users, CalendarDays, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDoctorDashboard from "../hooks/useDoctorDashboard";
import StatCard             from "../components/StatCard";
import DoctorTopCard        from "../components/doctor/DoctorTopCard";
import DoctorCalendar       from "../components/doctor/DoctorCalendar";
import TodayAppointmentsList from "../components/doctor/TodayAppointmentsList";
import RecentConsultationsList from "../components/doctor/RecentConsultationsList";
import RecordsAccessCard    from "../components/doctor/RecordsAccessCard";
import DiseaseStatsCard     from "../components/doctor/DiseaseStatsCard";
import TreatmentStatsCard   from "../components/doctor/TreatmentStatsCard";
import DoctorSummaryCard    from "../components/doctor/DoctorSummaryCard";

const DoctorDashboard = () => {
    const { user } = useAuth();
    const { getStats, getTodayAppointments, getConsultationsAndRecords, getAnalytics } = useDoctorDashboard();

    const [stats,        setStats]        = useState(null);
    const [todayAppts,   setTodayAppts]   = useState([]);
    const [consultRec,   setConsultRec]   = useState({ recentConsultations: [], records: [] });
    const [analytics,    setAnalytics]    = useState(null);
    const [loading,      setLoading]      = useState(true);

    useEffect(() => {
        Promise.allSettled([
            getStats(),
            getTodayAppointments(),
            getConsultationsAndRecords(),
            getAnalytics(),
        ]).then(([s, t, cr, a]) => {
            if (s.status  === "fulfilled") setStats(s.value);
            if (t.status  === "fulfilled") setTodayAppts(Array.isArray(t.value) ? t.value : []);
            if (cr.status === "fulfilled") setConsultRec(cr.value);
            if (a.status  === "fulfilled") setAnalytics(a.value);
        }).finally(() => setLoading(false));
    }, []);

    const displayName = user
        ? `Dr. ${user.name || ""} ${user.last_name || ""}`.trim()
        : "Doctor";

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
        <div className="p-4 sm:p-6 bg-slate-50 min-h-screen flex flex-col gap-6">

            {/* ── Header ── */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">¡Bienvenido, {displayName}!</h1>
                <p className="text-sm text-slate-400 mt-0.5">Aquí tienes un resumen de tus consultas</p>
            </div>

            {/* ── Tarjetas de resumen ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DoctorTopCard topDisease={s.topDisease} />

                <StatCard
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    label="Total de pacientes"
                    value={(s.totalPatients?.count ?? 0).toLocaleString()}
                    growth={`${s.totalPatients?.growth ?? 0}%`}
                    growthLabel="vs. mes pasado"
                    sparkline={s.totalPatients?.sparkline ?? []}
                    sparklineColor="#3b82f6"
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
                    icon={<UserPlus className="w-5 h-5 text-pink-600" />}
                    iconBg="bg-pink-100"
                    label="Nuevos pacientes"
                    value={s.newPatients?.count ?? 0}
                    growth={`${(s.newPatients?.vsLastMonth ?? 0) >= 0 ? "+" : ""}${s.newPatients?.vsLastMonth ?? 0}`}
                    growthLabel="vs. ayer"
                    sparkline={s.newPatients?.sparkline ?? []}
                    sparklineColor="#ec4899"
                />
            </div>

            {/* ── Calendario + Citas de hoy ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DoctorCalendar />
                <TodayAppointmentsList appointments={todayAppts} />
            </div>

            {/* ── Historial de consultas + Expedientes ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <RecentConsultationsList
                        consultations={consultRec.recentConsultations}
                        doctorName={user ? `${user.name || ""} ${user.last_name || ""}`.trim() : ""}
                    />
                </div>
                <div className="lg:col-span-2">
                    <RecordsAccessCard records={consultRec.records} />
                </div>
            </div>

            {/* ── Analytics ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DiseaseStatsCard
                    diseases={analytics?.diseases ?? []}
                    total={analytics?.totalForDiseases ?? 0}
                />
                <TreatmentStatsCard treatments={analytics?.treatments ?? []} />
                <DoctorSummaryCard  summary={analytics?.summary ?? {}} />
            </div>

        </div>
    );
};

export default DoctorDashboard;
