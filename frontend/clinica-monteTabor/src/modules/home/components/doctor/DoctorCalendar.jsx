import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useAppointmentsApi from "@/modules/schedule/appointments/hooks/useAppointmentsApi";
import useAppointmentTypes from "@/modules/schedule/appointments/hooks/useAppointmentTypes";

const DAYS   = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FALLBACK_COLOR = "#94a3b8";
const CANCELLED_COLOR = "#f87171";

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Calendario mensual del doctor. Trae las citas reales del mes visible
// (mismo endpoint y hook que el Calendario general,
// AppointmentsCalendar.jsx) y colorea cada día según el catálogo de
// tipos de cita, con la misma leyenda que ese calendario. Así el doctor
// ve qué días tiene citas y de qué tipo son, no solo si hay algo
// agendado ese día.
const DoctorCalendar = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getAppointments } = useAppointmentsApi();
    const { getAppointmentTypes } = useAppointmentTypes();

    const [cur, setCur] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [hoveredDay, setHoveredDay] = useState(null);

    const year  = cur.getFullYear();
    const month = cur.getMonth();
    const today = new Date();

    const colorMap = useMemo(
        () => Object.fromEntries(appointmentTypes.map((t) => [t.name, t.color])),
        [appointmentTypes]
    );

    useEffect(() => {
        getAppointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
    }, []);

    // Trae las citas reales del mes visible para este doctor, con el
    // mismo patrón que usa AppointmentsCalendar.jsx.
    useEffect(() => {
        if (!user?.id) return;
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        getAppointments({ doctor_id: user.id, dateFrom: toISO(monthStart), dateTo: toISO(monthEnd), limit: 500 })
            .then((res) => setAppointments(res.data || []))
            .catch(() => setAppointments([]));
    }, [year, month, user?.id]);

    const byDay = useMemo(() => {
        const map = {};
        for (const a of appointments) {
            const key = a.date?.split("T")[0];
            if (!key) continue;
            if (!map[key]) map[key] = [];
            map[key].push(a);
        }
        return map;
    }, [appointments]);

    // Arma la grilla del mes: rellena con celdas vacías hasta el primer
    // día de la semana del mes, agrega los días del mes y completa el
    // final con celdas vacías para que el total sea múltiplo de 7.
    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const prevMonth = () => setCur(new Date(year, month - 1, 1));
    const nextMonth = () => setCur(new Date(year, month + 1, 1));
    const goToday   = () => setCur(new Date());

    const isToday = (d) => d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    const dayKey  = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayAppts = (d) => (d ? byDay[dayKey(d)] || [] : []);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            {/* Encabezado */}
            <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Calendario de citas</p>
            </div>

            {/* Navegación de mes */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                    {MONTHS[month]}  {year}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToday}
                        className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                    >
                        Hoy
                    </button>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Encabezados de los días de la semana */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Celdas del calendario */}
            <div className="grid grid-cols-7 gap-y-0.5 flex-1">
                {cells.map((day, i) => {
                    const appts = dayAppts(day);
                    const dots = appts.slice(0, 3).map((a) =>
                        a.status === "cancelled" ? CANCELLED_COLOR : (colorMap[a.appointment_type] || FALLBACK_COLOR)
                    );
                    return (
                        <div
                            key={i}
                            className="relative flex flex-col items-center py-0.5"
                            onMouseEnter={() => day && appts.length > 0 && setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay((h) => (h === day ? null : h))}
                        >
                            {day && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/calendar/appointments", { state: { initialView: "calendar" } })}
                                        className={`w-7 h-7 flex items-center justify-center text-xs rounded-full font-medium transition-colors ${
                                            isToday(day)
                                                ? "bg-blue-600 text-white font-bold"
                                                : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                    >
                                        {day}
                                    </button>
                                    <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
                                        {dots.length > 0
                                            ? dots.map((c, idx) => (
                                                <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                                              ))
                                            : <span className="w-1.5 h-1.5" />}
                                    </div>

                                    {hoveredDay === day && (
                                        <div className="absolute z-20 top-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-100 p-2.5 w-48">
                                            <p className="text-[11px] font-semibold text-slate-800 mb-1.5">
                                                {appts.length} cita{appts.length !== 1 ? "s" : ""}
                                            </p>
                                            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                                                {appts.slice(0, 6).map((a) => (
                                                    <div key={a._id} className="flex items-center gap-1.5">
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: a.status === "cancelled" ? CANCELLED_COLOR : (colorMap[a.appointment_type] || FALLBACK_COLOR) }}
                                                        />
                                                        <span className="text-[10px] text-slate-500 truncate">
                                                            {fmt12(a.start_time)} · {a.patient_id ? `${a.patient_id.name} ${a.patient_id.last_name}` : "Paciente"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Leyenda, mismo catálogo global de tipos de cita que administra el admin desde
                Horarios, igual que en AppointmentsCalendar.jsx. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-50">
                {appointmentTypes.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin tipos de cita configurados</span>
                ) : (
                    appointmentTypes.map((t) => (
                        <div key={t._id} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                            <span className="text-xs text-slate-500">{t.name}</span>
                        </div>
                    ))
                )}
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CANCELLED_COLOR }} />
                    <span className="text-xs text-slate-500">Cancelada</span>
                </div>
            </div>
        </div>
    );
};

export default DoctorCalendar;
