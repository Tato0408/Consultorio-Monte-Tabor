import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { showError, showSuccess, confirmDelete, confirmTakeOverAppointment } from "@/lib/alerts";

// El ciclo real de una cita es pending, scheduled, completed o
// cancelled (ver AppointmentsForm.jsx). scheduled (Programada)
// equivale a en espera. Usa las mismas etiquetas que STATUS_OPTIONS
// en AppointmentFilters.jsx, para que el filtro y la insignia de
// estado de esta misma tabla usen exactamente el mismo texto en
// español.
const STATUS_BADGE = {
    pending: { label: "Agendado (sin confirmar)", className: "bg-slate-100 text-slate-600" },
    scheduled: { label: "En espera", className: "bg-amber-100 text-amber-700" },
    completed: { label: "Atendido", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
    no_show: { label: "No se presentó", className: "bg-slate-100 text-slate-500" },
    needs_reschedule: { label: "Por reagendar", className: "bg-orange-100 text-orange-600" },
    expired: { label: "Vencida", className: "bg-orange-100 text-orange-600" },
};

const formatPersonName = (person) =>
    person ? `${person.name} ${person.last_name}` : "—";

// Anchos proporcionales al contenido real de cada columna (no
// grid-cols-5 parejo). Hora ahora muestra el rango completo (14:00 -
// 14:30, no solo la hora de inicio), Paciente y Médico llevan nombres
// completos, Estado lleva la etiqueta más larga (Agendado sin
// confirmar) y Acciones un botón. Con columnas iguales, las cortas
// dejan mucho espacio vacío alrededor de su contenido centrado, sobre
// todo en los extremos (Hora a la izquierda, Acciones a la derecha),
// que es justo lo que se ve vacío en las esquinas.
// px-8 (en vez de px-6) aleja además el contenido del borde de la
// card. Se define una sola vez para que el encabezado y las filas
// usen exactamente la misma plantilla y las columnas coincidan
// siempre entre sí.
const ROW_GRID = "grid grid-cols-[1fr_1.3fr_1.3fr_1fr_0.9fr] gap-x-6 px-8";

// Mismas pestañas que antes vivían como <select> en AppointmentFilters.jsx,
// ahora como tabs (mismo estilo que TreatmentsPatientsTable.jsx). "" es
// "Todos los estados", el punto de partida por defecto.
const TABS = [
    { key: "", label: "Todos" },
    { key: "pending, scheduled", label: "Agendados" },
    { key: "pending", label: "Sin confirmar" },
    { key: "scheduled", label: "En espera" },
    { key: "completed", label: "Atendido" },
    { key: "cancelled", label: "Cancelado" },
    { key: "no_show", label: "No presentado" },
];

const AppointmentsTable = ({ appointments, isLoading, error, waitingCount, completedCount, statusFilter, onStatusChange, onDeleted }) => {
    const navigate = useNavigate();
    const { user, userType, hasPermission } = useAuth();
    const canAttend = hasPermission("calendar.consultations", "create");
    // Una enfermera solo puede continuar/tomar consultas de un procedimiento sin doctor
    // (ella es la proveedora principal ahí, ver requires_doctor en el procedimiento). Para
    // el resto de los roles con permiso (doctor, admin) no cambia nada.
    const canAttendRow = (appt) => {
        if (userType !== "nurse") return canAttend;
        const requiresDoctor = !appt.procedure_id || appt.procedure_id.requires_doctor !== false;
        return canAttend && !requiresDoctor;
    };
    const canDelete = hasPermission("calendar.consultations", "delete");
    // Evita doble clic mientras se resuelve la auto-asignación de una
    // consulta sin médico (ver más abajo), por fila para no bloquear
    // el resto de la tabla mientras tanto.
    const [claimingId, setClaimingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Si la consulta está agendada sin confirmar (pending) y no tiene
    // médico asignado, quien le dé clic a Continuar pasa a ser
    // automáticamente su médico atendiente. Si ya tiene un médico
    // asignado y es otro el que hace clic, se le pide confirmar que
    // coordinó con ese médico y el paciente antes de seguir; no se
    // reasigna nada en ese caso, es solo un aviso. Las canceladas
    // nunca llegan aquí (el botón ni se muestra, ver más abajo).
    const handleContinue = async (appt) => {
        // Procedimiento sin doctor: la enfermera es la proveedora principal, se auto
        // asigna/toma con el mismo criterio de abajo pero contra nurse_id y el endpoint
        // de aceptación de enfermería.
        const requiresDoctor = !appt.procedure_id || appt.procedure_id.requires_doctor !== false;
        if (appt.status === "pending" && !requiresDoctor) {
            const assignedNurseId = appt.nurse_id?._id || appt.nurse_id || null;
            if (!assignedNurseId) {
                setClaimingId(appt._id);
                try {
                    await apiClient(`/appointments/${appt._id}/accept-nurse`, { method: "PATCH" });
                } catch (err) {
                    showError(err.message || "No se pudo tomar esta consulta.");
                    return;
                } finally {
                    setClaimingId(null);
                }
            } else if (assignedNurseId !== user?.id) {
                const confirmed = await confirmTakeOverAppointment(formatPersonName(appt.nurse_id));
                if (!confirmed) return;
            }
        } else if (appt.status === "pending") {
            const assignedDoctorId = appt.doctor_id?._id || appt.doctor_id || null;
            if (!assignedDoctorId) {
                setClaimingId(appt._id);
                try {
                    await apiClient(`/appointments/${appt._id}/accept`, { method: "PATCH" });
                } catch (err) {
                    showError(err.message || "No se pudo tomar esta consulta.");
                    return;
                } finally {
                    setClaimingId(null);
                }
            } else if (assignedDoctorId !== user?.id) {
                const confirmed = await confirmTakeOverAppointment(formatPersonName(appt.doctor_id));
                if (!confirmed) return;
            }
        }
        // Navega al formulario de consulta. El cambio de estado a
        // completed ocurre al guardar la consulta, no en este click.
        navigate(`/calendar/consultations/${appt._id}`);
    };

    // Elimina el registro clínico (Consultation) de una cita ya atendida. El
    // endpoint de borrado espera el id de la consulta, no el de la cita, así
    // que primero se resuelve cuál consulta le pertenece a esta cita (mismo
    // endpoint que ya usa useConsultation.js para cargar el formulario).
    const handleDelete = async (appt) => {
        const confirmed = await confirmDelete({
            title: "¿Eliminar esta consulta?",
            text: "Esta acción es irreversible y la información no se podrá recuperar.",
        });
        if (!confirmed) return;

        setDeletingId(appt._id);
        try {
            const consultation = await apiClient(`/consultations/by-appointment/${appt._id}`);
            if (!consultation?._id) {
                showError("No se encontró el registro clínico de esta cita.");
                return;
            }
            await apiClient(`/consultations/${consultation._id}`, { method: "DELETE" });
            showSuccess("Eliminada", "La consulta fue eliminada correctamente");
            onDeleted?.();
        } catch (err) {
            showError(err.message || "No se pudo eliminar la consulta");
        } finally {
            setDeletingId(null);
        }
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

            <div className="flex items-center gap-1 mb-4 border-b border-slate-100 overflow-x-auto">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => onStatusChange(t.key)}
                        className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                            (statusFilter || "") === t.key
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Mismo patrón de columnas que la tabla comparativa de Reportes
                (ReportsSection.jsx): grid y padding horizontal, todo centrado
                respecto a su título, en vez de <table>, que por defecto alinea
                cada celda a la izquierda y sin separación simétrica entre
                columnas. Ver ROW_GRID arriba para los anchos por columna. */}
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
                                <span className="text-slate-700 text-center">{appt.start_time} - {appt.end_time}</span>
                                <span className="text-slate-700 text-center truncate">{formatPersonName(appt.patient_id)}</span>
                                <span className="text-slate-700 text-center truncate">
                                    {appt.doctor_id ? formatPersonName(appt.doctor_id) : appt.nurse_id ? `${formatPersonName(appt.nurse_id)} (enfermera)` : "—"}
                                </span>
                                <div className="flex justify-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                </div>
                                <div className="flex justify-center items-center gap-2">
                                    {/* Aviso para la enfermera asignada: a esta consulta le
                                        falta su nota de enfermería (ver nurse_note_pending en
                                        getAppointments). Abre la consulta para llenarla. */}
                                    {userType === "nurse" && appt.nurse_note_pending && (
                                        <button
                                            onClick={() => navigate(`/calendar/consultations/${appt._id}`)}
                                            title="Falta tu nota de enfermería en esta consulta"
                                            className="text-amber-500 hover:text-amber-600 p-1.5"
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                        </button>
                                    )}
                                    {appt.status === "completed" ? (
                                        <>
                                            <button
                                                onClick={() => navigate(`/calendar/consultations/${appt._id}`)}
                                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                            >
                                                Ver
                                            </button>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(appt)}
                                                    disabled={deletingId === appt._id}
                                                    title="Eliminar consulta"
                                                    className="text-slate-400 hover:text-red-600 p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </>
                                    ) : appt.status === "cancelled" || appt.status === "no_show" ? (
                                        <span className="text-xs text-slate-400 italic">No disponible</span>
                                    ) : canAttendRow(appt) ? (
                                        <button
                                            onClick={() => handleContinue(appt)}
                                            disabled={claimingId === appt._id}
                                            className="bg-[#0b66d6] text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-[#0a59ba] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {claimingId === appt._id ? "Tomando..." : "Continuar"}
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