import { useEffect, useState, useCallback } from "react";
import { Users, CalendarDays, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDoctorDashboard from "../hooks/useDoctorDashboard";
import StatCard             from "../components/StatCard";
import DoctorTopCard        from "../components/doctor/DoctorTopCard";
import DoctorCalendar       from "../components/doctor/DoctorCalendar";
import TodayAppointmentsList from "../components/doctor/TodayAppointmentsList";
import RecentConsultationsList from "../components/doctor/RecentConsultationsList";
import RecordsAccessCard    from "../components/doctor/RecordsAccessCard";
import DashboardWelcomeHeader from "../components/DashboardWelcomeHeader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AppointmentsFormCalendar from "@/modules/schedule/appointments/components/AppointmentsFormCalendar";

// Página principal del doctor. Carga en paralelo las estadísticas, las
// citas del día y el historial de consultas con sus expedientes, y
// arma el dashboard con las tarjetas y listas correspondientes.
const DoctorDashboard = () => {
    const { user, userType, hasPermission } = useAuth();
    const canCreateAppt = hasPermission("calendar.appointments", "create");
    const { getStats, getTodayAppointments, getConsultationsAndRecords } = useDoctorDashboard();

    const [stats,        setStats]        = useState(null);
    const [todayAppts,   setTodayAppts]   = useState([]);
    const [consultRec,   setConsultRec]   = useState({ recentConsultations: [], records: [] });
    const [loading,      setLoading]      = useState(true);
    // Modal de "Agregar nueva cita", que reutiliza el mismo formulario de la
    // interfaz de Calendario (AppointmentsFormCalendar.jsx), con las mismas
    // funcionalidades, en vez de un formulario aparte.
    const [isNewApptOpen, setIsNewApptOpen] = useState(false);

    const loadDashboard = useCallback(() => {
        return Promise.allSettled([
            getStats(),
            getTodayAppointments(),
            getConsultationsAndRecords(),
        ]).then(([s, t, cr]) => {
            if (s.status  === "fulfilled") setStats(s.value);
            if (t.status  === "fulfilled") setTodayAppts(Array.isArray(t.value) ? t.value : []);
            if (cr.status === "fulfilled") setConsultRec(cr.value);
        });
    }, []);

    useEffect(() => {
        loadDashboard().finally(() => setLoading(false));
    }, [loadDashboard]);

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
        <div className="bg-slate-50 min-h-screen">
            <DashboardWelcomeHeader
                displayName={displayName}
                subtitle="Aquí tienes un resumen de tus consultas"
                user={user}
                userType={userType}
            />

            <div className="p-4 sm:p-6 pt-3 flex flex-col gap-6">

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DoctorTopCard topProcedure={s.topProcedure} />

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

            {/* Calendario y citas de hoy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DoctorCalendar />
                <TodayAppointmentsList
                    appointments={todayAppts}
                    canCreate={canCreateAppt}
                    onAddAppointment={() => setIsNewApptOpen(true)}
                />
            </div>

            {/* Historial de consultas y expedientes */}
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

            </div>

            {/* Modal de "Agregar nueva cita": el mismo AppointmentsFormCalendar.jsx
                que usa la interfaz de Calendario, embebido en un diálogo en vez de
                navegar a una ruta nueva. onCloseOverride y onSavedOverride cierran
                el modal y refrescan el dashboard, en vez de navegar a
                /calendar/appointments. */}
            <Dialog open={isNewApptOpen} onOpenChange={(open) => !open && setIsNewApptOpen(false)}>
                <DialogContent showCloseButton={false} className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0">
                    {isNewApptOpen && (
                        <AppointmentsFormCalendar
                            onCloseOverride={() => setIsNewApptOpen(false)}
                            onSavedOverride={() => { setIsNewApptOpen(false); loadDashboard(); }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorDashboard;
