import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAppointmentsApi from "../hooks/useAppointmentsApi";
import useSchedule from "../hooks/useSchedule";
import useAppointmentTypes from "../hooks/useAppointmentTypes";
import { confirmDelete, confirmNoShow, showError, showSuccess } from "@/lib/alerts";
import apiClient from "@/lib/apiClient";


const HOUR_HEIGHT = 64;
const START_HOUR  = 7;
const END_HOUR    = 20;
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAYS_ES     = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Color de respaldo para una cita sin appointment_type elegido (o
// cuyo tipo ya no existe en el catálogo, por ejemplo si un admin lo
// borró). El color normalmente sale del catálogo global de tipos de
// cita (ver AppointmentTypesSection.jsx), administrado por el rol
// admin.
const FALLBACK_COLOR = "#94a3b8";
const CANCELLED_COLOR = "#f87171";

const STATUS_BADGES = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-600",
    pending:   "bg-amber-100 text-amber-700",
    no_show:   "bg-slate-100 text-slate-500",
    expired:   "bg-orange-100 text-orange-600",
};
const STATUS_LABELS = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    pending:   "Pendiente",
    no_show:   "No se presentó",
    expired:   "Vencida",
};


const toISO = (d) => d.toISOString().split("T")[0];

const timeToMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekDays = (start) =>
    Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });

const fmtDate = (iso) => {
    if (!iso) return "—";
    const [yr, mo, dy] = iso.split("T")[0].split("-").map(Number);
    return new Date(yr, mo - 1, dy).toLocaleDateString("es-SV", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
};

const calcNowOffset = () => {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const px   = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    return px >= 0 && px <= HOURS.length * HOUR_HEIGHT ? px : null;
};

const getNowLabel = () => {
    const now = new Date();
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
};

// colorMap: { [nombreDelTipo]: colorHex } armado a partir del
// catálogo global de tipos de cita. Se busca por appointment_type
// (el campo que solo categoriza y colorea), nunca por type (que
// sigue siendo Consulta Médica General o Procedimiento y define
// precio y duración aparte).
const typeColors = (appointmentType, status, colorMap) => {
    if (status === "cancelled") return { color: CANCELLED_COLOR, cancelled: true };
    return { color: (appointmentType && colorMap?.[appointmentType]) || FALLBACK_COLOR, cancelled: false };
};


const computeColumns = (appts) => {
    if (!appts.length) return [];
    const sorted = [...appts].sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
    const layout = sorted.map(appt => ({ appt, col: -1, totalCols: 1 }));
    const colEnds = [];

    layout.forEach(item => {
        const start = timeToMins(item.appt.start_time);
        let placed = false;
        for (let c = 0; c < colEnds.length; c++) {
            if (colEnds[c] <= start) {
                item.col = c;
                colEnds[c] = timeToMins(item.appt.end_time);
                placed = true;
                break;
            }
        }
        if (!placed) {
            item.col = colEnds.length;
            colEnds.push(timeToMins(item.appt.end_time));
        }
    });

    layout.forEach(item => {
        const start = timeToMins(item.appt.start_time);
        const end   = timeToMins(item.appt.end_time);
        let maxCol  = item.col;
        layout.forEach(other => {
            if (other === item) return;
            if (start < timeToMins(other.appt.end_time) && end > timeToMins(other.appt.start_time))
                maxCol = Math.max(maxCol, other.col);
        });
        item.totalCols = maxCol + 1;
    });

    return layout;
};


const ApptDot = ({ appt, col = 0, colIdx = 0, isSelected, onSelect, colorMap }) => {
    const [hovered, setHovered] = useState(false);
    const startMins = timeToMins(appt.start_time);
    const topPx     = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const colors    = typeColors(appt.appointment_type, appt.status, colorMap);

    if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null;

    const popupOnLeft = colIdx >= 5;

    // z-[15] en hover: por encima de las tarjetas en reposo (z-10,
    // para tapar a las de otros días) pero por debajo del encabezado
    // sticky (z-20). Así, al pasar el mouse y hacer scroll a la vez,
    // la tarjeta (y su tooltip, contenido en este mismo stacking
    // context) queda tapada por el encabezado en vez de seguir
    // traspasándolo.
    return (
        <div
            className={`absolute ${hovered ? "z-[15]" : "z-10"}`}
            style={{ top: `${topPx + 4}px`, left: `${6 + col * 14}px` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={e => { e.stopPropagation(); onSelect(appt); }}
        >
            <div
                className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-sm transition-transform ${colors.cancelled ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-offset-1 ring-blue-500 scale-125" : "hover:scale-125"}`}
                style={{ backgroundColor: colors.color }}
            />

            {hovered && (
                <div
                    className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-3 pointer-events-none"
                    style={{
                        ...(popupOnLeft ? { right: "18px" } : { left: "18px" }),
                        top: "-6px",
                        width: "210px",
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.color }} />
                        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{appt.appointment_type || appt.type}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[appt.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[appt.status] || appt.status}
                        </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {fmt12(appt.start_time)} – {fmt12(appt.end_time)}
                        </p>
                        {appt.patient_id && (
                            <p className="truncate">{appt.patient_id.name} {appt.patient_id.last_name}</p>
                        )}
                        {appt.doctor_id && (
                            <p className="truncate">Dr. {appt.doctor_id.name} {appt.doctor_id.last_name}</p>
                        )}
                    </div>
                    <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                        Haz clic para ver el detalle completo
                    </p>
                </div>
            )}
        </div>
    );
};


const ApptCard = ({ appt, col = 0, totalCols = 1, colIdx = 0, isSelected, onSelect, colorMap }) => {
    const [hovered, setHovered] = useState(false);
    const startMins = timeToMins(appt.start_time);
    const endMins   = timeToMins(appt.end_time);
    const topPx     = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const heightPx  = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 22);
    const colors    = typeColors(appt.appointment_type, appt.status, colorMap);

    if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null;

    const popupOnLeft = colIdx >= 5;

    // z-[15] en hover: por encima de las tarjetas en reposo (z-10,
    // para tapar a las de otros días) pero por debajo del encabezado
    // sticky (z-20). Así, al pasar el mouse y hacer scroll a la vez,
    // la tarjeta (y su tooltip, contenido en este mismo stacking
    // context) queda tapada por el encabezado en vez de seguir
    // traspasándolo.
    return (
        <div
            className={`absolute ${hovered ? "z-[15]" : "z-10"}`}
            style={{
                top:    `${topPx}px`,
                height: `${heightPx}px`,
                left:   `calc(${(col / totalCols) * 100}% + 1px)`,
                width:  `calc(${(1 / totalCols) * 100}% - 2px)`,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={e => { e.stopPropagation(); onSelect(appt); }}
        >
            <div
                className={`w-full h-full rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden text-xs transition-shadow text-slate-800 ${colors.cancelled ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"}`}
                style={{ backgroundColor: `${colors.color}1A`, borderLeft: `3px solid ${colors.color}` }}
            >
                <p className="font-semibold leading-tight truncate">{appt.start_time} – {appt.end_time}</p>
                {heightPx > 28 && <p className="text-[10px] leading-tight truncate">{appt.appointment_type || appt.type}</p>}
                {heightPx > 44 && (
                    <p className="text-[10px] leading-tight truncate opacity-75">
                        {appt.patient_id ? `${appt.patient_id.name} ${appt.patient_id.last_name}` : ""}
                    </p>
                )}
            </div>

            {hovered && (
                <div
                    className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-3 pointer-events-none"
                    style={{
                        ...(popupOnLeft ? { right: "calc(100% + 6px)" } : { left: "calc(100% + 6px)" }),
                        top: "0",
                        width: "210px",
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.color }} />
                        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{appt.appointment_type || appt.type}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[appt.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[appt.status] || appt.status}
                        </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {fmt12(appt.start_time)} – {fmt12(appt.end_time)}
                        </p>
                        {appt.patient_id && (
                            <p className="truncate">{appt.patient_id.name} {appt.patient_id.last_name}</p>
                        )}
                        {appt.doctor_id && (
                            <p className="truncate">Dr. {appt.doctor_id.name} {appt.doctor_id.last_name}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const BreakCard = ({ brk }) => {
    const startMins = timeToMins(brk.start_time);
    const endMins   = timeToMins(brk.end_time);
    const topPx     = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const heightPx  = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 16);
    if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null;
    return (
        <div
            className="absolute left-0 right-0 select-none pointer-events-none flex items-center justify-center"
            style={{
                top: `${topPx}px`,
                height: `${heightPx}px`,
                backgroundImage:
                    "repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, rgba(251,191,36,0.18) 6px, rgba(251,191,36,0.18) 7px)",
                borderTop:    "1px solid rgba(251,191,36,0.35)",
                borderBottom: "1px solid rgba(251,191,36,0.35)",
            }}
        >
            {heightPx > 30 && (
                <span className="text-[9px] font-medium tracking-widest uppercase text-amber-500/70 select-none">
                    descanso
                </span>
            )}
        </div>
    );
};


const DetailPanel = ({ appt, isDoctor, isAdmin, onClose, onRefresh, navigate, canUpdateAppt, colorMap }) => {
    const { updateAppointmentStatus } = useAppointmentsApi();
    const [cancelling, setCancelling] = useState(false);

    const handleCancel = async () => {
        const ok = await confirmDelete();
        if (!ok) return;
        setCancelling(true);
        try {
            await updateAppointmentStatus(appt._id, "cancelled");
            onRefresh();
            onClose();
        } catch {
            showError("No se pudo cancelar la cita. Intente de nuevo.");
        } finally {
            setCancelling(false);
        }
    };

    // Marca que el paciente no llegó a una cita Programada. Igual que cancelar/reagendar,
    // solo aplica a "scheduled": una cita ya no se puede volver a tocar una vez
    // completada, cancelada, marcada como no_show o vencida (ver también
    // AppointmentTable.jsx, que ya no deja continuar una consulta desde una cita en
    // ninguno de esos dos últimos estados).
    const [markingNoShow, setMarkingNoShow] = useState(false);
    const handleNoShow = async () => {
        const ok = await confirmNoShow();
        if (!ok) return;
        setMarkingNoShow(true);
        try {
            await updateAppointmentStatus(appt._id, "no_show");
            onRefresh();
            onClose();
        } catch {
            showError("No se pudo marcar la cita como no presentada. Intente de nuevo.");
        } finally {
            setMarkingNoShow(false);
        }
    };

    // Aceptar (doctor) / asignar (admin) una cita "pending" con un clic, sin pasar
    // por el formulario completo — igual que en AppointmentsGrid.jsx (pestaña
    // Citas). Si el procedimiento requiere enfermera, el backend rechaza sin una
    // (ver appointmentsController.acceptAppointment/assignDoctor), así que ahí se
    // pide elegir una de la lista de enfermeras libres en ese horario antes de
    // confirmar, en vez de aceptar directo.
    const isPendingAction = appt.status === "pending" && (isDoctor || isAdmin);
    const nurseRequired = !!appt.procedure_id?.requires_nurse;
    const [resolvingAccept, setResolvingAccept] = useState(false);
    const [needsNurseChoice, setNeedsNurseChoice] = useState(false);
    const [nurseOptions, setNurseOptions] = useState([]);
    const [doctorOptions, setDoctorOptions] = useState([]);
    const [chosenNurseId, setChosenNurseId] = useState("");
    const [chosenDoctorId, setChosenDoctorId] = useState("");
    const [confirming, setConfirming] = useState(false);

    const nurseParams = {
        date: new Date(appt.date).toISOString().split("T")[0],
        start_time: appt.start_time,
        end_time: appt.end_time,
        appointment_id: appt._id,
    };

    const finishAccept = async (nurseId) => {
        setConfirming(true);
        try {
            await apiClient(`/appointments/${appt._id}/accept`, {
                method: "PATCH",
                body: nurseId ? { nurse_id: nurseId } : {},
            });
            showSuccess("Cita aceptada correctamente");
            // No se cierra el panel: onRefresh(appt._id) reselecciona esta misma cita
            // tras refrescar, así se ve de una vez agendada (y con el borde azul, ver
            // isSelected en ApptDot/ApptCard) sin que el doctor tenga que ir a buscarla.
            onRefresh(appt._id);
        } catch (err) {
            showError(err.message || "No se pudo aceptar la cita");
        } finally {
            setConfirming(false);
        }
    };

    const finishAssign = async (doctorId, nurseId) => {
        if (!doctorId) { showError("Selecciona un doctor."); return; }
        setConfirming(true);
        try {
            await apiClient(`/appointments/${appt._id}/assign`, {
                method: "PATCH",
                body: { doctor_id: doctorId, ...(nurseId ? { nurse_id: nurseId } : {}) },
            });
            showSuccess("Cita asignada correctamente");
            onRefresh(appt._id);
        } catch (err) {
            showError(err.message || "No se pudo asignar la cita");
        } finally {
            setConfirming(false);
        }
    };

    // Doctor: un clic si no requiere enfermera; si requiere, primero carga las
    // libres en ese horario y pide elegir una.
    const handleAcceptClick = async () => {
        if (!nurseRequired) return finishAccept();
        setResolvingAccept(true);
        try {
            const response = await apiClient("/appointments/nurses-for-acceptance", { params: nurseParams });
            setNurseOptions(Array.isArray(response) ? response : response.data || []);
            setNeedsNurseChoice(true);
        } catch (err) {
            showError(err.message || "No se pudieron cargar las enfermeras.");
        } finally {
            setResolvingAccept(false);
        }
    };

    // Admin: siempre elige el doctor a mano; si el procedimiento requiere
    // enfermera, también carga las libres en ese horario.
    const handleAssignClick = async () => {
        setResolvingAccept(true);
        try {
            const doctorsResponse = await apiClient("/doctors/catalog");
            setDoctorOptions(Array.isArray(doctorsResponse) ? doctorsResponse : doctorsResponse.data || []);
            if (nurseRequired) {
                const nursesResponse = await apiClient("/appointments/nurses-for-acceptance", { params: nurseParams });
                setNurseOptions(Array.isArray(nursesResponse) ? nursesResponse : nursesResponse.data || []);
            }
            setNeedsNurseChoice(true);
        } catch (err) {
            showError(err.message || "No se pudieron cargar los doctores.");
        } finally {
            setResolvingAccept(false);
        }
    };

    const colors = typeColors(appt.appointment_type, appt.status, colorMap);

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 h-[80vh] rounded-t-2xl md:relative md:inset-auto md:h-full md:w-72 md:rounded-none md:z-auto border-t md:border-t-0 md:border-l border-slate-100 bg-white overflow-y-auto flex-shrink-0">
            {/* Manija de arrastre, visible solo en mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.color }} />
                            {appt.appointment_type || appt.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[appt.status]}`}>
                            {STATUS_LABELS[appt.status]}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {fmtDate(appt.date)}
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {fmt12(appt.start_time)} – {fmt12(appt.end_time)} ({appt.duration_minutes} min)
                    </div>
                </div>

                {/* Paciente */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Paciente</p>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                            {appt.patient_id?.name?.[0]}{appt.patient_id?.last_name?.[0]}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {appt.patient_id ? `${appt.patient_id.name} ${appt.patient_id.last_name}` : "N/A"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Doctor (solo admin) */}
                {!isDoctor && appt.doctor_id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Doctor</p>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                                {appt.doctor_id?.name?.[0]}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Dr. {appt.doctor_id.name} {appt.doctor_id.last_name}
                                </p>
                                <p className="text-xs text-slate-400">{appt.doctor_id.specialty}</p>
                            </div>
                        </div>
                    </div>
                )}

                {appt.description && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notas</p>
                        <p className="text-sm text-slate-600">{appt.description}</p>
                    </div>
                )}

                {/* Acciones */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Acciones</p>

                    {isPendingAction && needsNurseChoice ? (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 space-y-2.5">
                            {isAdmin && (
                                <select
                                    value={chosenDoctorId}
                                    onChange={(e) => setChosenDoctorId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-500"
                                >
                                    <option value="">Selecciona un doctor</option>
                                    {doctorOptions.map((d) => (
                                        <option key={d._id} value={d._id}>Dr. {d.name} {d.last_name}</option>
                                    ))}
                                </select>
                            )}
                            {nurseRequired && (
                                <select
                                    value={chosenNurseId}
                                    onChange={(e) => setChosenNurseId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-500"
                                >
                                    <option value="">{nurseOptions.length ? "Selecciona una enfermera" : "Sin enfermeras disponibles en ese horario"}</option>
                                    {nurseOptions.map((n) => (
                                        <option key={n._id} value={n._id}>{n.name} {n.last_name}</option>
                                    ))}
                                </select>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setNeedsNurseChoice(false); setChosenDoctorId(""); setChosenNurseId(""); }}
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 text-xs font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={confirming || (nurseRequired && !chosenNurseId) || (isAdmin && !chosenDoctorId)}
                                    onClick={() => (isAdmin ? finishAssign(chosenDoctorId, chosenNurseId) : finishAccept(chosenNurseId))}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                    {confirming ? "Confirmando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    ) : isPendingAction ? (
                        <button
                            onClick={isAdmin ? handleAssignClick : handleAcceptClick}
                            disabled={resolvingAccept}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                            {resolvingAccept ? "Cargando..." : isAdmin ? "Asignar cita" : "Aceptar cita"}
                        </button>
                    ) : null}

                    <button
                        onClick={() => navigate(`/calendar/appointments/${appt._id}`, { state: { fromView: "calendar" } })}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Ver expediente
                    </button>
                    {/* Reagendar solo aplica a una cita Programada: pendiente aún
                        no está confirmada, y cancelada/completada/no_show/expired
                        ya no se puede reagendar. */}
                    {canUpdateAppt && appt.status === "scheduled" && (
                        <button
                            onClick={() => navigate(`/calendar/appointments/${appt._id}`, { state: { editMode: true, fromView: "calendar" } })}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                        >
                            Reagendar cita
                        </button>
                    )}
                    {canUpdateAppt && !isPendingAction && appt.status !== "cancelled" && appt.status !== "completed" && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelling ? "Cancelando..." : "Cancelar cita"}
                        </button>
                    )}
                    {/* Mismo criterio que Reagendar: solo una cita Programada puede marcarse
                        como no presentada. */}
                    {canUpdateAppt && appt.status === "scheduled" && (
                        <button
                            onClick={handleNoShow}
                            disabled={markingNoShow}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {markingNoShow ? "Guardando..." : "No se presentó"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


const AppointmentsCalendar = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { user, userType, hasPermission } = useAuth();
    const isDoctor  = userType === "doctor";
    // El admin tiene el mismo flujo de "por aceptar" que el doctor, pero en vez
    // de aceptarla él mismo, la asigna a un doctor (ver DetailPanel más abajo,
    // mismo criterio que AppointmentsGrid.jsx).
    const isAdmin   = userType === "admin";
    const canCreateAppt = hasPermission("calendar.appointments", "create");
    const canUpdateAppt = hasPermission("calendar.appointments", "update");
    const { getAppointments, getAppointmentsStats } = useAppointmentsApi();
    const { getSchedule } = useSchedule();
    const { getAppointmentTypes } = useAppointmentTypes();

    // selectApptId y selectApptDate (puestos por RecentConsultationsList.jsx
    // del dashboard del doctor al hacer clic en "Ver detalles") preseleccionan
    // una cita puntual al llegar aquí, igual que si el usuario la hubiera
    // clickeado directamente en el calendario. selectApptDate decide en qué
    // semana arrancar, para que la cita buscada sí esté entre las citas
    // cargadas.
    const pendingSelectId = useRef(location.state?.selectApptId || null);

    const [weekStart,    setWeekStart]    = useState(() =>
        location.state?.selectApptDate ? getWeekStart(new Date(location.state.selectApptDate)) : getWeekStart(new Date())
    );
    const [appointments, setAppointments] = useState([]);
    const [stats,        setStats]        = useState({ scheduled: 0, waiting: 0, completed: 0, nextAppointment: null });
    const [loading,      setLoading]      = useState(true);
    const [selected,     setSelected]     = useState(null);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType,   setFilterType]   = useState("");
    const [filterDoctor, setFilterDoctor] = useState("");
    const [doctors,      setDoctors]      = useState([]);
    const [refresh,      setRefresh]      = useState(0);
    const [scheduleData, setScheduleData] = useState(null);
    // Catálogo global de tipos de cita (nombre y color), administrado
    // por el rol admin desde Horarios. Alimenta la leyenda, el filtro
    // Tipo de atención y el color de cada cita.
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const colorMap = useMemo(
        () => Object.fromEntries(appointmentTypes.map(t => [t.name, t.color])),
        [appointmentTypes]
    );

    const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
    const weekEnd  = useMemo(() => {
        const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
    }, [weekStart]);
    const today = toISO(new Date());

 
    useEffect(() => {
        getAppointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
    }, []);

    useEffect(() => {
        if (isDoctor) return;
        // Antes llamaba a una URL fija a localhost:4000, que en producción nunca
        // resuelve: la petición fallaba en silencio y el filtro "por doctor"
        // quedaba vacío para siempre. apiClient ya resuelve la URL base correcta.
        apiClient("/doctors")
            .then(list => setDoctors(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, [isDoctor]);


    useEffect(() => {
        setLoading(true);
        const params = { dateFrom: toISO(weekStart), dateTo: toISO(weekEnd), limit: 500 };
        if (isDoctor && user?.id)       params.doctor_id = user.id;
        if (!isDoctor && filterDoctor)  params.doctor_id = filterDoctor;
        if (filterStatus)               params.status    = filterStatus;

        getAppointments(params)
            .then(res => {
                const data = res.data || [];
                setAppointments(data);
                if (pendingSelectId.current) {
                    const match = data.find(a => a._id === pendingSelectId.current);
                    if (match) setSelected(match);
                    pendingSelectId.current = null;
                }
            })
            .catch(() => setAppointments([]))
            .finally(() => setLoading(false));
    }, [weekStart, weekEnd, isDoctor, user?.id, filterStatus, filterDoctor, refresh]);

    
    useEffect(() => {
        getAppointmentsStats(today).then(setStats).catch(() => {});
    }, [today, refresh]);


    useEffect(() => {
        if (!isDoctor || !user?.id) return;
        getSchedule(user.id).then(setScheduleData).catch(() => {});
    }, [isDoctor, user?.id]);

    
    const breakBlocks = useMemo(() => {
        if (!scheduleData?.breaks?.length) return {};
        const map = {};
        for (const day of weekDays) {
            const dow = day.getDay();
            const availability = scheduleData.weekly_availability?.find(d => d.day === dow);
            if (!availability?.is_available) continue;
            const dayBreaks = scheduleData.breaks.filter(b => b.day === dow);
            if (!dayBreaks.length) continue;
            map[toISO(day)] = dayBreaks;
        }
        return map;
    }, [scheduleData, weekDays]);

 
    const byDay = useMemo(() => {
        const map = {};
        for (const a of appointments) {
            if (filterType && a.appointment_type !== filterType) continue;
            const key = a.date?.split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(a);
        }
        return map;
    }, [appointments, filterType]);

    const goToday  = () => setWeekStart(getWeekStart(new Date()));
    const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
    const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
    const triggerRefresh = () => setRefresh(r => r + 1);
    // Como refreshAndReselect(id), deja pendingSelectId listo para que el
    // efecto de arriba reseleccione esa misma cita ni bien llegan los datos
    // frescos del refetch (útil tras aceptar/asignar desde el propio
    // Calendario: la cita pasa a "scheduled" y se queda resaltada en vez de
    // cerrarse el panel).
    const refreshAndReselect = (id) => {
        pendingSelectId.current = id || null;
        triggerRefresh();
    };


    const [nowOffset, setNowOffset] = useState(calcNowOffset);
    const [nowLabel,  setNowLabel]  = useState(getNowLabel);
    useEffect(() => {
        const tick = () => { setNowOffset(calcNowOffset()); setNowLabel(getNowLabel()); };
        const id = setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, []);
    const todayColIdx = weekDays.findIndex(d => toISO(d) === today);

    return (
        <div className="flex flex-col bg-slate-50 overflow-hidden h-full">

            {/* Barra superior */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-0 bg-white border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900">Calendario</h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">Visualización de citas y horarios de los doctores</p>
                    </div>
                    {canCreateAppt && (
                        <button
                            onClick={() => navigate("/calendar/appointments/new", { state: { fromView: "calendar" } })}
                            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex-shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Nueva cita</span>
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                    {[
                        { label: "Citas hoy",   value: stats.scheduled, sub: "Total del día",       color: "text-blue-600",  bg: "bg-blue-50" },
                        { label: "Confirmadas", value: stats.waiting,   sub: "Listas para atender", color: "text-green-600", bg: "bg-green-50" },
                        { label: "Completadas", value: stats.completed, sub: "Finalizadas hoy",     color: "text-slate-700", bg: "bg-slate-100" },
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-2 sm:p-3 shadow-sm flex items-center gap-2 sm:gap-3">
                            <span className={`text-lg sm:text-xl font-bold ${s.color} ${s.bg} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>{s.value}</span>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-semibold text-slate-700 leading-tight">{s.label}</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                            </div>
                        </div>
                    ))}
                    {stats.nextAppointment ? (
                        <div className="bg-white border border-slate-100 rounded-xl p-2 sm:p-3 shadow-sm flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm flex-shrink-0">
                                {stats.nextAppointment.doctor_id?.name?.[0]}{stats.nextAppointment.doctor_id?.last_name?.[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                                    Dr. {stats.nextAppointment.doctor_id?.name} {stats.nextAppointment.doctor_id?.last_name}
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-green-500 font-medium">Disponible</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-400">Próx.: {fmt12(stats.nextAppointment.start_time)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-100 rounded-xl p-2 sm:p-3 shadow-sm flex items-center justify-center">
                            <p className="text-[10px] sm:text-xs text-slate-400 text-center">Sin próximas citas</p>
                        </div>
                    )}
                </div>

                {/* Navegación de semana */}
                <div className="flex flex-wrap items-center justify-between gap-y-1.5 pb-2">
                    <div className="flex items-center gap-1">
                        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                            <span className="hidden sm:inline">{weekStart.getDate()} – {weekEnd.getDate()} {MONTHS_ES[weekEnd.getMonth()]} {weekEnd.getFullYear()}</span>
                            <span className="sm:hidden">{weekStart.getDate()}–{weekEnd.getDate()} {MONTHS_ES[weekEnd.getMonth()].slice(0, 3)}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={triggerRefresh} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={goToday} className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                            Hoy
                        </button>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
                            <button className="px-2.5 py-1.5 bg-blue-600 text-white font-medium">Semana</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cuerpo */}
            <div className="flex flex-1 overflow-hidden">

                {/* Barra lateral de filtros */}
                <div className="w-40 border-r border-slate-100 bg-white overflow-y-auto flex-shrink-0 p-3 hidden md:flex flex-col">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Filtros</p>

                    {!isDoctor && (
                        <div className="mb-3">
                            <label className="text-xs font-medium text-slate-600 block mb-1">Doctor</label>
                            <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white">
                                <option value="">Todos los doctores</option>
                                {doctors.map(d => (
                                    <option key={d._id} value={d._id}>
                                        Dr. {d.name} {d.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="text-xs font-medium text-slate-600 block mb-1">Estado</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white">
                            <option value="">Todas</option>
                            <option value="scheduled">Programada</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="pending">Pendiente</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="text-xs font-medium text-slate-600 block mb-1">Tipo de cita</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white">
                            <option value="">Todos</option>
                            {appointmentTypes.map(t => (
                                <option key={t._id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => { setFilterStatus(""); setFilterType(""); setFilterDoctor(""); }}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors mb-6">
                        <RefreshCw className="w-3 h-3" /> Limpiar filtros
                    </button>

                    {/* Leyenda: catálogo global de tipos de cita, administrado por el
                        rol admin desde Horarios (ver AppointmentTypesSection.jsx). */}
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Leyenda</p>
                    {appointmentTypes.length === 0 ? (
                        <p className="text-[11px] text-slate-400 mb-1.5">Sin tipos de cita configurados</p>
                    ) : (
                        appointmentTypes.map((t) => (
                            <div key={t._id} className="flex items-center gap-2 mb-1.5">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                <span className="text-xs text-slate-600">{t.name}</span>
                            </div>
                        ))
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CANCELLED_COLOR }} />
                        <span className="text-xs text-slate-600">Cancelada</span>
                    </div>
                </div>

                {/* Calendario */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            Cargando citas...
                        </div>
                    ) : (
                        <div className="min-w-[560px]">
                            {/* Encabezados de los días */}
                            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 grid"
                                style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
                                <div className="border-r border-slate-100" />
                                {weekDays.map((day, i) => {
                                    const isToday  = toISO(day) === today;
                                    const dow      = day.getDay();
                                    const avail    = scheduleData?.weekly_availability?.find(d => d.day === dow);
                                    const isDayOff = scheduleData && avail && !avail.is_available;
                                    return (
                                        <div key={i} className={`text-center py-2 border-l border-slate-100 ${isDayOff ? "bg-slate-50" : ""}`}>
                                            <p className={`text-[10px] font-medium uppercase ${isDayOff ? "text-slate-300" : "text-slate-400"}`}>{DAYS_ES[dow]}</p>
                                            <p className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                                                isToday ? "bg-blue-600 text-white" : isDayOff ? "text-slate-300" : "text-slate-700"
                                            }`}>
                                                {day.getDate()}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Time grid */}
                            <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                                {/* Líneas y etiquetas de hora */}
                                {HOURS.map((h, hi) => (
                                    <div key={h} className="absolute w-full flex items-start pointer-events-none"
                                        style={{ top: `${hi * HOUR_HEIGHT}px` }}>
                                        <span className="w-12 text-right pr-2 text-[10px] text-slate-400 -translate-y-2 flex-shrink-0 select-none">
                                            {h % 12 === 0 ? 12 : h % 12}{h < 12 ? " AM" : " PM"}
                                        </span>
                                        <div className="flex-1 border-t border-slate-100" />
                                    </div>
                                ))}

                                {/* Bordes verticales de las columnas de días */}
                                {weekDays.map((_, di) => (
                                    <div key={di} className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                                        style={{ left: `calc(48px + ${di} * (100% - 48px) / 7)`, width: `calc((100% - 48px) / 7)` }} />
                                ))}

                                {/* Línea de la hora actual */}
                                {nowOffset !== null && todayColIdx >= 0 && (
                                    <>
                                        <div className="absolute pointer-events-none z-[5] flex justify-end pr-1 items-center"
                                            style={{ top: `${nowOffset - 9}px`, left: 0, width: "48px", height: "18px" }}>
                                            <span className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                                {nowLabel}
                                            </span>
                                        </div>
                                        <div className="absolute pointer-events-none z-[5] flex items-center"
                                            style={{
                                                top:   `${nowOffset}px`,
                                                left:  `calc(48px + ${todayColIdx} * (100% - 48px) / 7)`,
                                                width: `calc((100% - 48px) / 7)`,
                                            }}>
                                            <div className="w-2 h-2 rounded-full bg-slate-800 -ml-1 flex-shrink-0" />
                                            <div className="flex-1 border-t-2 border-slate-800" />
                                        </div>
                                    </>
                                )}

                                {/* Tarjetas de citas y descansos por día */}
                                {weekDays.map((day, di) => {
                                    const key    = toISO(day);
                                    const appts  = byDay[key] || [];
                                    const breaks = breakBlocks[key] || [];
                                    const layout = computeColumns(appts);
                                    const dow    = day.getDay();
                                    const avail  = scheduleData?.weekly_availability?.find(d => d.day === dow);
                                    const isDayOff = scheduleData && avail && !avail.is_available;
                                    const isPast = key < today;
                                    const isCellDisabled = isPast || !canCreateAppt;
                                    return (
                                        <div key={di} className={`absolute top-0 bottom-0 ${isCellDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                                            style={{
                                                left:  `calc(48px + ${di} * (100% - 48px) / 7)`,
                                                width: `calc((100% - 48px) / 7)`,
                                            }}
                                            onClick={() => { if (isCellDisabled) return; navigate(`/calendar/appointments/new?date=${toISO(day)}`, { state: { fromView: "calendar" } }); }}
                                        >
                                            {(isDayOff || isPast) && (
                                                <div className="absolute inset-0 pointer-events-none z-10"
                                                    style={{ backgroundColor: "rgba(241,245,249,0.75)" }} />
                                            )}
                                            {!isDayOff && breaks.map((brk, bi) => (
                                                <BreakCard key={`brk-${bi}`} brk={brk} />
                                            ))}
                                            {layout.map(({ appt, col, totalCols }) => {
                                                const startMins  = timeToMins(appt.start_time);
                                                const hasConflict = appts.some(other =>
                                                    other._id !== appt._id &&
                                                    Math.abs(startMins - timeToMins(other.start_time)) <= 10
                                                );
                                                return hasConflict ? (
                                                    <ApptDot
                                                        key={appt._id}
                                                        appt={appt}
                                                        col={col}
                                                        colIdx={di}
                                                        isSelected={selected?._id === appt._id}
                                                        onSelect={setSelected}
                                                        colorMap={colorMap}
                                                    />
                                                ) : (
                                                    <ApptCard
                                                        key={appt._id}
                                                        appt={appt}
                                                        col={col}
                                                        totalCols={totalCols}
                                                        colIdx={di}
                                                        isSelected={selected?._id === appt._id}
                                                        onSelect={setSelected}
                                                        colorMap={colorMap}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fondo para mobile del panel de detalle */}
                {selected && (
                    <div
                        className="fixed inset-0 bg-black/30 z-40 md:hidden"
                        onClick={() => setSelected(null)}
                    />
                )}

                {/* Panel de detalle */}
                {selected && (
                    <DetailPanel
                        appt={selected}
                        isDoctor={isDoctor}
                        isAdmin={isAdmin}
                        onClose={() => setSelected(null)}
                        onRefresh={refreshAndReselect}
                        navigate={navigate}
                        canUpdateAppt={canUpdateAppt}
                        colorMap={colorMap}
                    />
                )}
            </div>
        </div>
    );
};

export default AppointmentsCalendar;
