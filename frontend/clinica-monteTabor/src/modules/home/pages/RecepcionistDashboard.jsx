import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck2, Users2, Stethoscope, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useReceptionistDashboard from "../hooks/useReceptionistDashboard";
import useMedicalData from "@/modules/schedule/appointments/hooks/useMedicalData";
import usePatients from "@/modules/patients/hooks/usePatients";
import StatCard from "../components/StatCard";
import DoctorsAgendaSection from "../components/DoctorsAgendaSection";
import QuickAppointmentForm from "../components/QuickAppointmentForm";
import UpcomingAppointmentsList from "../components/UpcomingAppointmentsList";
import QuickPatientForm from "../components/receptionist/QuickPatientForm";
import PendingConfirmationsPanel from "../components/PendingConfirmationsPanel";
import DashboardWelcomeHeader from "../components/DashboardWelcomeHeader";

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Dashboard del recepcionista: mismo patrón de página (header + StatCards + Promise.allSettled)
// que AdminDashboard.jsx / DoctorDashboard.jsx, reutilizando StatCard y los hooks/endpoints ya
// existentes de citas y pacientes para las dos secciones de registro rápido.
const RecepcionistDashboard = () => {
    const { user, userType } = useAuth();
    const navigate = useNavigate();
    const { getStats, getDoctorsAgenda, getUpcomingAppointments, getPendingConfirmations } = useReceptionistDashboard();
    const medicalData = useMedicalData();
    const { createPatient } = usePatients();

    const [stats, setStats] = useState(null);
    const [agenda, setAgenda] = useState({ doctors: [] });
    const [agendaDate, setAgendaDate] = useState(todayStr());
    const [agendaLoading, setAgendaLoading] = useState(true);
    const [upcoming, setUpcoming] = useState([]);
    const [pending, setPending] = useState({ pending: [], confirmed: [], counts: { pending: 0, confirmed: 0 } });
    const [loading, setLoading] = useState(true);
    const [prefill, setPrefill] = useState(null);

    const patientFormRef = useRef(null);

    const loadStatsAndLists = useCallback(() => {
        return Promise.allSettled([
            getStats(),
            getUpcomingAppointments(),
            getPendingConfirmations(),
        ]).then(([s, u, p]) => {
            if (s.status === "fulfilled") setStats(s.value);
            if (u.status === "fulfilled") setUpcoming(Array.isArray(u.value) ? u.value : []);
            if (p.status === "fulfilled") setPending(p.value);
        });
    }, [getStats, getUpcomingAppointments, getPendingConfirmations]);

    const loadAgenda = useCallback((date) => {
        setAgendaLoading(true);
        return getDoctorsAgenda(date)
            .then((data) => setAgenda(data))
            .catch(() => setAgenda({ doctors: [] }))
            .finally(() => setAgendaLoading(false));
    }, [getDoctorsAgenda]);

    useEffect(() => {
        loadStatsAndLists().finally(() => setLoading(false));
    }, [loadStatsAndLists]);

    useEffect(() => {
        loadAgenda(agendaDate);
    }, [agendaDate, loadAgenda]);

    // Refresca todo lo que puede haber cambiado tras crear/confirmar/cancelar una cita
    const refreshAll = () => {
        loadStatsAndLists();
        loadAgenda(agendaDate);
    };

    const refreshAfterPatient = () => {
        medicalData.fetchMedicalData();
    };

    const displayName = user ? `${user.name || ""} ${user.last_name || ""}`.trim() : "Recepcionista";

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
                subtitle="Aquí tienes un resumen de la actividad de hoy"
                user={user}
                userType={userType}
            />

            <div className="p-4 sm:p-6 pt-3 flex flex-col gap-6">

            {/* ── Tarjetas de resumen ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<CalendarCheck2 className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    label="Citas de hoy"
                    value={s.appointmentsToday?.count ?? 0}
                    growth={`${s.appointmentsToday?.pending ?? 0} pendientes`}
                    growthLabel={`· ${s.appointmentsToday?.confirmed ?? 0} confirmadas`}
                    sparkline={s.appointmentsToday?.sparkline ?? []}
                    sparklineColor="#2563eb"
                />

                <StatCard
                    icon={<Users2 className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    label="Pacientes atendidos hoy"
                    value={s.patientsAttendedToday?.count ?? 0}
                    growth={`${(s.patientsAttendedToday?.vsYesterday ?? 0) >= 0 ? "+" : ""}${s.patientsAttendedToday?.vsYesterday ?? 0}`}
                    growthLabel="vs. ayer"
                    sparkline={s.patientsAttendedToday?.sparkline ?? []}
                    sparklineColor="#059669"
                />

                <StatCard
                    icon={<Stethoscope className="w-5 h-5 text-violet-600" />}
                    iconBg="bg-violet-100"
                    label="Doctores disponibles"
                    value={`${s.availableDoctors?.count ?? 0} de ${s.availableDoctors?.total ?? 0}`}
                    growth="Activos"
                    growthLabel="ahora mismo"
                    sparkline={[]}
                    sparklineColor="#7c3aed"
                />

                <StatCard
                    icon={<Clock className="w-5 h-5 text-amber-600" />}
                    iconBg="bg-amber-100"
                    label="Citas próximas (1h)"
                    value={s.upcomingAppointments?.count ?? 0}
                    growth={s.upcomingAppointments?.next ? `Próxima a las ${s.upcomingAppointments.next.start_time}` : "Sin citas próximas"}
                    growthLabel={s.upcomingAppointments?.next?.doctorName ?? ""}
                    sparkline={[]}
                    sparklineColor="#d97706"
                />
            </div>

            {/* ── Agenda + Registro rápido de citas ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <DoctorsAgendaSection
                        agenda={agenda}
                        date={agendaDate}
                        onDateChange={setAgendaDate}
                        onSlotClick={setPrefill}
                        loading={agendaLoading}
                    />
                    <QuickPatientForm ref={patientFormRef} createPatient={createPatient} onCreated={refreshAfterPatient} />
                </div>

                <div className="flex flex-col gap-4">
                    <QuickAppointmentForm
                        medicalData={medicalData}
                        prefill={prefill}
                        onCreated={refreshAll}
                        onRequestNewPatient={() => patientFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    />
                    <UpcomingAppointmentsList
                        appointments={upcoming}
                        onViewAll={() => navigate("/calendar/appointments")}
                    />
                    <PendingConfirmationsPanel
                        data={pending}
                        onChanged={refreshAll}
                        onViewAll={() => navigate("/calendar/appointments")}
                    />
                </div>
            </div>

            </div>
        </div>
    );
};

export default RecepcionistDashboard;
