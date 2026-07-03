import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAppointmentsApi from "../hooks/useAppointmentsApi";
import useSchedule from "../hooks/useSchedule";
import { confirmDelete, showError } from "@/lib/alerts";

// ── Constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour
const START_HOUR  = 7;
const END_HOUR    = 20;
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAYS_ES     = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TYPE_COLORS = {
    "Consulta":            { dot: "bg-blue-500",    card: "bg-blue-50 border-l-[3px] border-blue-400 text-blue-900" },
    "Control":             { dot: "bg-emerald-500", card: "bg-emerald-50 border-l-[3px] border-emerald-400 text-emerald-900" },
    "Control/Seguimiento": { dot: "bg-emerald-500", card: "bg-emerald-50 border-l-[3px] border-emerald-400 text-emerald-900" },
    "Procedimiento":       { dot: "bg-orange-500",  card: "bg-orange-50 border-l-[3px] border-orange-400 text-orange-900" },
    "Descanso":            { dot: "bg-yellow-400",  card: "bg-yellow-50 border-l-[3px] border-yellow-400 text-yellow-900" },
};

const STATUS_BADGES = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-600",
    pending:   "bg-amber-100 text-amber-700",
};
const STATUS_LABELS = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    pending:   "Pendiente",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
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

const typeColors = (type, status) => {
    if (status === "cancelled") return { dot: "bg-red-400", card: "bg-red-50 border-l-[3px] border-red-300 text-red-800 opacity-60" };
    return TYPE_COLORS[type] ?? { dot: "bg-slate-400", card: "bg-slate-50 border-l-[3px] border-slate-300 text-slate-700" };
};

// ── Overlap column layout ────────────────────────────────────────────────────
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

// ── Appointment dot with hover popup ─────────────────────────────────────────
const ApptDot = ({ appt, col = 0, colIdx = 0, isSelected, onSelect }) => {
    const [hovered, setHovered] = useState(false);
    const startMins = timeToMins(appt.start_time);
    const topPx     = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const colors    = typeColors(appt.type, appt.status);

    if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null;

    const popupOnLeft = colIdx >= 5;

    return (
        <div
            className={`absolute ${hovered ? "z-30" : "z-10"}`}
            style={{ top: `${topPx + 4}px`, left: `${6 + col * 14}px` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={e => { e.stopPropagation(); onSelect(appt); }}
        >
            <div className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-sm transition-transform ${colors.dot} ${isSelected ? "ring-2 ring-offset-1 ring-blue-500 scale-125" : "hover:scale-125"}`} />

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
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{appt.type}</span>
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

// ── Appointment card (isolated, no conflict) ─────────────────────────────────
const ApptCard = ({ appt, col = 0, totalCols = 1, colIdx = 0, isSelected, onSelect }) => {
    const [hovered, setHovered] = useState(false);
    const startMins = timeToMins(appt.start_time);
    const endMins   = timeToMins(appt.end_time);
    const topPx     = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const heightPx  = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 22);
    const colors    = typeColors(appt.type, appt.status);

    if (topPx < 0 || topPx > HOURS.length * HOUR_HEIGHT) return null;

    const popupOnLeft = colIdx >= 5;

    return (
        <div
            className={`absolute ${hovered ? "z-30" : "z-10"}`}
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
            <div className={`w-full h-full rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden text-xs transition-shadow ${colors.card} ${isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"}`}>
                <p className="font-semibold leading-tight truncate">{appt.start_time} – {appt.end_time}</p>
                {heightPx > 28 && <p className="text-[10px] leading-tight truncate">{appt.type}</p>}
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
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{appt.type}</span>
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

// ── Break block on grid ──────────────────────────────────────────────────────
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

// ── Detail panel ─────────────────────────────────────────────────────────────
const DetailPanel = ({ appt, isDoctor, onClose, onRefresh, navigate }) => {
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

    const colors = typeColors(appt.type, appt.status);

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 h-[80vh] rounded-t-2xl md:relative md:inset-auto md:h-full md:w-72 md:rounded-none md:z-auto border-t md:border-t-0 md:border-l border-slate-100 bg-white overflow-y-auto flex-shrink-0">
            {/* Drag handle — visible on mobile only */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.card.includes("blue") ? "bg-blue-100 text-blue-700" : ""} ${STATUS_BADGES[appt.status] || "bg-slate-100 text-slate-600"}`}>
                            {appt.type}
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
                    <button
                        onClick={() => navigate(`/calendar/appointments/${appt._id}`)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Ver expediente
                    </button>
                    <button
                        onClick={() => navigate(`/calendar/appointments/${appt._id}`, { state: { editMode: true } })}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                    >
                        Reagendar cita
                    </button>
                    {appt.status !== "cancelled" && appt.status !== "completed" && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelling ? "Cancelando..." : "Cancelar cita"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main page ────────────────────────────────────────────────────────────────
const AppointmentsCalendar = () => {
    const navigate  = useNavigate();
    const { user, userType } = useAuth();
    const isDoctor  = userType === "doctor";
    const { getAppointments, getAppointmentsStats } = useAppointmentsApi();
    const { getSchedule } = useSchedule();

    const [weekStart,    setWeekStart]    = useState(() => getWeekStart(new Date()));
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

    const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
    const weekEnd  = useMemo(() => {
        const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
    }, [weekStart]);
    const today = toISO(new Date());

    // Load doctors list for admin filter
    useEffect(() => {
        if (isDoctor) return;
        fetch("http://localhost:4000/api/doctors", { credentials: "include" })
            .then(r => r.json())
            .then(list => setDoctors(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, [isDoctor]);

    // Load appointments
    useEffect(() => {
        setLoading(true);
        const params = { dateFrom: toISO(weekStart), dateTo: toISO(weekEnd), limit: 500 };
        if (isDoctor && user?.id)       params.doctor_id = user.id;
        if (!isDoctor && filterDoctor)  params.doctor_id = filterDoctor;
        if (filterStatus)               params.status    = filterStatus;

        getAppointments(params)
            .then(res => setAppointments(res.data || []))
            .catch(() => setAppointments([]))
            .finally(() => setLoading(false));
    }, [weekStart, weekEnd, isDoctor, user?.id, filterStatus, filterDoctor, refresh]);

    // Load stats
    useEffect(() => {
        getAppointmentsStats(today).then(setStats).catch(() => {});
    }, [today, refresh]);

    // Load schedule to render break blocks (only for logged-in doctor)
    useEffect(() => {
        if (!isDoctor || !user?.id) return;
        getSchedule(user.id).then(setScheduleData).catch(() => {});
    }, [isDoctor, user?.id]);

    // Build break blocks indexed by ISO date, solo para días que están activos en weekly_availability
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

    // Group by date, applying type filter client-side
    const byDay = useMemo(() => {
        const map = {};
        for (const a of appointments) {
            if (filterType && a.type !== filterType) continue;
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

    // Current time offset (px) + label — updates every minute
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

            {/* ── Top bar ── */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-0 bg-white border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900">Calendario</h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">Visualización de citas y horarios de los doctores</p>
                    </div>
                    <button
                        onClick={() => navigate("/calendar/appointments/new")}
                        className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Nueva cita</span>
                    </button>
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

                {/* Week nav */}
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

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Filters sidebar */}
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
                        <label className="text-xs font-medium text-slate-600 block mb-1">Tipo de atención</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white">
                            <option value="">Todos</option>
                            <option value="Consulta">Consulta</option>
                            <option value="Control/Seguimiento">Control</option>
                            <option value="Procedimiento">Procedimiento</option>
                        </select>
                    </div>

                    <button onClick={() => { setFilterStatus(""); setFilterType(""); setFilterDoctor(""); }}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors mb-6">
                        <RefreshCw className="w-3 h-3" /> Limpiar filtros
                    </button>

                    {/* Legend */}
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Leyenda</p>
                    {Object.entries(TYPE_COLORS).map(([type, c]) => (
                        <div key={type} className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                            <span className="text-xs text-slate-600">{type}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-400" />
                        <span className="text-xs text-slate-600">Cancelada</span>
                    </div>
                </div>

                {/* Calendar */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            Cargando citas...
                        </div>
                    ) : (
                        <div className="min-w-[560px]">
                            {/* Day headers */}
                            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 grid"
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
                                {/* Hour lines + labels */}
                                {HOURS.map((h, hi) => (
                                    <div key={h} className="absolute w-full flex items-start pointer-events-none"
                                        style={{ top: `${hi * HOUR_HEIGHT}px` }}>
                                        <span className="w-12 text-right pr-2 text-[10px] text-slate-400 -translate-y-2 flex-shrink-0 select-none">
                                            {h % 12 === 0 ? 12 : h % 12}{h < 12 ? " AM" : " PM"}
                                        </span>
                                        <div className="flex-1 border-t border-slate-100" />
                                    </div>
                                ))}

                                {/* Vertical day column borders */}
                                {weekDays.map((_, di) => (
                                    <div key={di} className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                                        style={{ left: `calc(48px + ${di} * (100% - 48px) / 7)`, width: `calc((100% - 48px) / 7)` }} />
                                ))}

                                {/* Current time line */}
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

                                {/* Appointment + break cards per day */}
                                {weekDays.map((day, di) => {
                                    const key    = toISO(day);
                                    const appts  = byDay[key] || [];
                                    const breaks = breakBlocks[key] || [];
                                    const layout = computeColumns(appts);
                                    const dow    = day.getDay();
                                    const avail  = scheduleData?.weekly_availability?.find(d => d.day === dow);
                                    const isDayOff = scheduleData && avail && !avail.is_available;
                                    const isPast = key < today;
                                    return (
                                        <div key={di} className={`absolute top-0 bottom-0 ${isPast ? "cursor-not-allowed" : "cursor-pointer"}`}
                                            style={{
                                                left:  `calc(48px + ${di} * (100% - 48px) / 7)`,
                                                width: `calc((100% - 48px) / 7)`,
                                            }}
                                            onClick={() => { if (isPast) return; navigate(`/calendar/appointments/new?date=${toISO(day)}`); }}
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

                {/* Mobile backdrop for detail panel */}
                {selected && (
                    <div
                        className="fixed inset-0 bg-black/30 z-40 md:hidden"
                        onClick={() => setSelected(null)}
                    />
                )}

                {/* Detail panel */}
                {selected && (
                    <DetailPanel
                        appt={selected}
                        isDoctor={isDoctor}
                        onClose={() => setSelected(null)}
                        onRefresh={triggerRefresh}
                        navigate={navigate}
                    />
                )}
            </div>
        </div>
    );
};

export default AppointmentsCalendar;
