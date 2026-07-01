import { useState, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import useDoctorDashboard from "../../hooks/useDoctorDashboard";

const DAYS   = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const DoctorCalendar = () => {
    const { getCalendar } = useDoctorDashboard();
    const [cur,      setCur]      = useState(new Date());
    const [apptSet,  setApptSet]  = useState(new Set());
    const [loadedYr, setLoadedYr] = useState(null);

    const year  = cur.getFullYear();
    const month = cur.getMonth();
    const today = new Date();

    useEffect(() => {
        if (loadedYr === year) return;
        getCalendar(year)
            .then(({ dates }) => {
                setApptSet(new Set(dates));
                setLoadedYr(year);
            })
            .catch(() => {});
    }, [year]);

    // Build calendar grid
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

    const isToday   = (d) => d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    const hasAppt   = (d) => d && apptSet.has(`${year}-${month + 1}-${d}`);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Calendario de citas</p>
            </div>

            {/* Navigation */}
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

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-y-0.5 flex-1">
                {cells.map((day, i) => (
                    <div key={i} className="flex flex-col items-center py-0.5">
                        {day && (
                            <>
                                <span className={`w-7 h-7 flex items-center justify-center text-xs rounded-full font-medium transition-colors ${
                                    isToday(day)
                                        ? "bg-blue-600 text-white font-bold"
                                        : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                                }`}>
                                    {day}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                    hasAppt(day)
                                        ? isToday(day) ? "bg-white" : "bg-blue-500"
                                        : "invisible"
                                }`} />
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-slate-500">Citas</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-700" />
                    <span className="text-xs text-slate-500">Día actual</span>
                </div>
            </div>
        </div>
    );
};

export default DoctorCalendar;
