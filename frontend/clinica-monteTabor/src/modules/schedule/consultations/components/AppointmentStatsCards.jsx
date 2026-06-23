import { Calendar, Clock, CheckCircle2, Stethoscope } from "lucide-react";

const StatCard = ({ icon: Icon, iconBg, label, value, isLoading }) => (
    <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm flex-1">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="text-white" size={20} />
        </div>
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold text-slate-800">
                {isLoading ? "—" : value}
            </p>
        </div>
    </div>
);

const formatPatientName = (patient) =>
    patient ? `${patient.name} ${patient.last_name}` : "Sin paciente";

const AppointmentStatsCards = ({ stats, isLoading }) => {
    const next = stats.nextAppointment;

    return (
        <div className="flex gap-4 mb-6">
            <StatCard
                icon={Calendar}
                iconBg="bg-[#6d4ed1]"
                label="Agendados"
                value={stats.scheduled}
                isLoading={isLoading}
            />
            <StatCard
                icon={Clock}
                iconBg="bg-[#2f7af5]"
                label="En espera"
                value={stats.waiting}
                isLoading={isLoading}
            />
            <StatCard
                icon={CheckCircle2}
                iconBg="bg-[#34a853]"
                label="Completados"
                value={stats.completed}
                isLoading={isLoading}
            />

            {/* Card destacada de próxima cita */}
            <div className="bg-[#0b66d6] rounded-xl px-5 py-4 shadow-md shadow-blue-100 flex-1 relative overflow-hidden text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-100 mb-1">
                    Próxima cita
                </div>
                {next ? (
                    <>
                        <p className="text-xl font-bold leading-tight">{next.start_time}</p>
                        <p className="text-sm font-medium truncate">{formatPatientName(next.patient_id)}</p>
                        <p className="text-xs text-blue-100 truncate">{next.type}</p>
                    </>
                ) : (
                    <p className="text-sm text-blue-100 mt-2">No hay próximas citas</p>
                )}
                <Stethoscope className="absolute -right-2 -bottom-2 text-white/15" size={64} />
            </div>
        </div>
    );
};

export default AppointmentStatsCards;