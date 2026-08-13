import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// El ciclo real de una cita es pending -> scheduled -> completed / cancelled
// (ver AppointmentsForm.jsx); "scheduled" ("Programada") equivale a "en espera".
// Mismas etiquetas que STATUS_OPTIONS en AppointmentFilters.jsx, para que el filtro y la
// insignia de estado de esta misma tabla usen exactamente el mismo texto en español.
const STATUS_BADGE = {
    pending: { label: "Agendado (sin confirmar)", className: "bg-slate-100 text-slate-600" },
    scheduled: { label: "En espera", className: "bg-amber-100 text-amber-700" },
    completed: { label: "Atendido", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

const formatPersonName = (person) =>
    person ? `${person.name} ${person.last_name}` : "—";

// Anchos proporcionales al contenido real de cada columna (no grid-cols-5 parejo): Hora es
// corta ("14:00"), Paciente/Médico llevan nombres completos, Estado lleva la etiqueta más larga
// ("Agendado (sin confirmar)") y Acciones un botón. Con columnas iguales, las cortas dejaban
// mucho espacio vacío alrededor de su contenido centrado — sobre todo en los extremos (Hora a
// la izquierda, Acciones a la derecha), que es justo lo que se veía "vacío" en las esquinas.
// px-8 (en vez de px-6) aleja además el contenido del borde de la card. Se define una sola vez
// para que el encabezado y las filas usen exactamente la misma plantilla y las columnas
// coincidan siempre entre sí.
const ROW_GRID = "grid grid-cols-[0.7fr_1.3fr_1.3fr_1.2fr_1fr] gap-x-6 px-8";

const AppointmentsTable = ({ appointments, isLoading, error, waitingCount, completedCount }) => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const canAttend = hasPermission("calendar.consultations", "create");
    const canEdit = hasPermission("calendar.consultations", "update");

    const handleContinue = (appointmentId) => {
        // Navega al formulario de consulta; el cambio de estado a "completed"
        // ocurre al guardar la consulta, no en este click.
        navigate(`/calendar/consultations/${appointmentId}`);
    };

    return (
        <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="font-semibold text-slate-800">Consultas del día</h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {waitingCount} En espera
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {completedCount} Atendidas
                </span>
            </div>

            {/* Mismo patrón de columnas que la tabla comparativa de Reportes (ReportsSection.jsx):
                grid + padding horizontal, todo centrado respecto a su título — en vez de
                <table>, que por defecto alinea cada celda a la izquierda y sin separación
                simétrica entre columnas. Ver ROW_GRID arriba para los anchos por columna. */}
            <div className="overflow-x-auto">
                <div className="min-w-[720px] text-sm">
                    <div className={`${ROW_GRID} py-2 border-b border-slate-100 text-slate-400`}>
                        <span className="font-medium text-center">Hora</span>
                        <span className="font-medium text-center">Paciente</span>
                        <span className="font-medium text-center">Médico atendiendo</span>
                        <span className="font-medium text-center">Estado</span>
                        <span className="font-medium text-center">Acciones</span>
                    </div>

                    {isLoading && (
                        <p className="py-8 text-center text-slate-400">Cargando consultas...</p>
                    )}

                    {!isLoading && error && (
                        <p className="py-8 text-center text-red-500">
                            No se pudieron cargar las consultas. {error}
                        </p>
                    )}

                    {!isLoading && !error && appointments.length === 0 && (
                        <p className="py-8 text-center text-slate-400">
                            No hay consultas para los filtros seleccionados.
                        </p>
                    )}

                    {!isLoading && !error && appointments.map((appt) => {
                        const badge = STATUS_BADGE[appt.status] || STATUS_BADGE.pending;
                        const isWaiting = appt.status === "scheduled";

                        return (
                            <div
                                key={appt._id}
                                className={`${ROW_GRID} py-3 items-center border-b border-slate-50 last:border-0 ${isWaiting ? "bg-blue-50/40" : ""}`}
                            >
                                <span className="text-slate-700 text-center">{appt.start_time}</span>
                                <span className="text-slate-700 text-center truncate">{formatPersonName(appt.patient_id)}</span>
                                <span className="text-slate-700 text-center truncate">{formatPersonName(appt.doctor_id)}</span>
                                <div className="flex justify-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                </div>
                                <div className="flex justify-center">
                                    {appt.status === "completed" ? (
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/calendar/consultations/${appt._id}${canEdit ? "" : "?mode=view"}`
                                                )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            {canEdit ? "Editar" : "Ver registro"}
                                        </button>
                                    ) : canAttend ? (
                                        <button
                                            onClick={() => handleContinue(appt._id)}
                                            className="bg-[#0b66d6] text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-[#0a59ba]"
                                        >
                                            Continuar
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AppointmentsTable;