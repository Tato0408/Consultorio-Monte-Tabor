import { Calendar, Clock, CheckCircle2, Stethoscope } from "lucide-react";
import { formatTime12h } from "@/lib/timeFormat";

/*
 * Tarjeta de estadística con ícono, etiqueta y valor. Cuando la tarjeta es
 * angosta (celular con dos columnas, o escritorio con cuatro columnas junto
 * al menú lateral) el ícono va arriba y el texto debajo, así la etiqueta
 * usa todo el ancho de la tarjeta y nunca se sale del borde. Con espacio
 * suficiente (sm y xl) el ícono vuelve a quedar a la izquierda del texto.
 */
const StatCard = ({ icon: Icon, iconBg, label, value, isLoading, onClick, isActive }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex min-w-0 flex-col items-start gap-3 bg-white border rounded-xl px-4 py-4 shadow-sm text-left transition-colors sm:flex-row sm:items-center sm:gap-4 sm:px-5 lg:flex-col lg:items-start lg:gap-3 xl:flex-row xl:items-center xl:gap-4 ${
            onClick ? "cursor-pointer hover:border-[#0b66d6]/40 hover:shadow-md" : "cursor-default"
        } ${isActive ? "border-[#0b66d6] ring-1 ring-[#0b66d6]/30" : "border-slate-100"}`}
    >
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="text-white" size={20} />
        </div>
        <div className="min-w-0 w-full text-left">
            <p className="text-sm leading-tight text-slate-500 break-words">{label}</p>
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
        // Dos columnas desde el celular más angosto y cuatro en escritorio. Cada
        // tarjeta acomoda su contenido al ancho disponible (ver StatCard).
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

            {/* Tarjeta destacada de la próxima cita. */}
            <div className="min-w-0 bg-[#0b66d6] rounded-xl px-4 py-4 sm:px-5 shadow-md shadow-blue-100 relative overflow-hidden text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-100 mb-1">
                    Próxima cita
                </div>
                {next ? (
                    <>
                        <p className="text-base sm:text-xl font-bold leading-tight break-words">{formatTime12h(next.start_time)} - {formatTime12h(next.end_time)}</p>
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
