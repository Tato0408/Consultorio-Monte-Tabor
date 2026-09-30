import { Calendar, Clock, CheckCircle2, Stethoscope } from "lucide-react";
import { formatTime12h } from "@/lib/timeFormat";

const StatCard = ({ icon: Icon, iconBg, label, value, isLoading, onClick, isActive }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-4 bg-white border rounded-xl px-5 py-4 shadow-sm text-left transition-colors ${
            onClick ? "cursor-pointer hover:border-[#0b66d6]/40 hover:shadow-md" : "cursor-default"
        } ${isActive ? "border-[#0b66d6] ring-1 ring-[#0b66d6]/30" : "border-slate-100"}`}
    >
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="text-white" size={20} />
        </div>
        {/* min-w-0: sin esto, en un celular angosto la etiqueta ("Completados", "En
            espera") no se encoge para caber junto al ícono y se sale por el borde derecho
            de la card en vez de envolver — mismo bug que en las cards de Enfermeras/
            Pacientes (NurseStatCards.jsx/PatientStatCards.jsx). */}
        <div className="min-w-0 flex-1 text-left">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold text-slate-800">
                {isLoading ? "—" : value}
            </p>
        </div>
    </button>
);

const formatPatientName = (patient) =>
    patient ? `${patient.name} ${patient.last_name}` : "Sin paciente";

// onFilterClick(statusValue) filtra la tabla de abajo por ese estado
// y por las citas del usuario logueado (doctor_id). activeFilter
// permite resaltar la tarjeta que corresponde al filtro actualmente
// aplicado.
const AppointmentStatsCards = ({ stats, isLoading, onFilterClick, activeFilter }) => {
    const next = stats.nextAppointment;

    const isCardActive = (statusValue) =>
        Boolean(activeFilter?.doctor_id) && activeFilter?.status === statusValue;

    return (
        // grid-cols-1 en el celular más angosto: con 2 columnas para 4 cards, cada una
        // quedaba tan angosta que la etiqueta ("En espera", "Completados") apenas cabía
        // envuelta junto al ícono y el valor, viéndose apretada/solapada. Con una sola
        // columna cada card usa el ancho completo de la pantalla.
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
                icon={Calendar}
                iconBg="bg-[#6d4ed1]"
                label="Agendados"
                value={stats.scheduled}
                isLoading={isLoading}
                onClick={() => onFilterClick?.("scheduled,completed")}
                isActive={isCardActive("scheduled,completed")}
            />
            <StatCard
                icon={Clock}
                iconBg="bg-[#2f7af5]"
                label="En espera"
                value={stats.waiting}
                isLoading={isLoading}
                onClick={() => onFilterClick?.("scheduled")}
                isActive={isCardActive("scheduled")}
            />
            <StatCard
                icon={CheckCircle2}
                iconBg="bg-[#34a853]"
                label="Completados"
                value={stats.completed}
                isLoading={isLoading}
                onClick={() => onFilterClick?.("completed")}
                isActive={isCardActive("completed")}
            />

            {/* Card destacada de próxima cita */}
            <div className="bg-[#0b66d6] rounded-xl px-5 py-4 shadow-md shadow-blue-100 relative overflow-hidden text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-100 mb-1">
                    Próxima cita
                </div>
                {next ? (
                    <>
                        <p className="text-xl font-bold leading-tight">{formatTime12h(next.start_time)} - {formatTime12h(next.end_time)}</p>
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