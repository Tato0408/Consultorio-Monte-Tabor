import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// La semana empieza en lunes, igual que el selector de la app móvil.
const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const clamp = (date, min, max) => (date > max ? new Date(max) : date < min ? new Date(min) : date);
const withYearMonth = (date, year, month) => new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));

// "AAAA-MM-DD" <-> Date en hora local, el mismo formato que usaba el
// <input type="date"> que este componente reemplaza.
const fromValue = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};
const toValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const displayValue = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
const longLabel = (date) => `${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;

/**
 * Campo de fecha con el mismo selector que la app móvil (DatePickerSheet.jsx):
 * vistas de Día (con saltos de una semana y "Hoy"), Mes y Año, para no tener
 * que avanzar mes por mes. Por defecto no deja elegir fechas posteriores a
 * hoy. value y max/min usan "AAAA-MM-DD"; onChange recibe un objeto
 * { target: { value } } para ser compatible con los manejadores que antes
 * leían e.target.value de un <input type="date">.
 */
export default function DatePickerField({
  label,
  id,
  value,
  onChange,
  error,
  disabled = false,
  max,
  min = "1900-01-01",
  placeholder = "DD/MM/AAAA",
  className = "",
  compact = false,
}) {
  const maxDate = useMemo(() => startOfDay(fromValue(max) || new Date()), [max]);
  const minDate = useMemo(() => startOfDay(fromValue(min) || new Date(1900, 0, 1)), [min]);
  const today = startOfDay(new Date());
  const current = fromValue(value);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => clamp(current || maxDate, minDate, maxDate));
  const [shown, setShown] = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const [mode, setMode] = useState("day");
  const yearsRef = useRef(null);

  const openPicker = () => {
    if (disabled) return;
    const initial = clamp(current || maxDate, minDate, maxDate);
    setSelected(initial);
    setShown({ year: initial.getFullYear(), month: initial.getMonth() });
    setMode("day");
    setOpen(true);
  };

  const select = (date) => {
    const next = clamp(date, minDate, maxDate);
    setSelected(next);
    setShown({ year: next.getFullYear(), month: next.getMonth() });
  };

  const isMonthDisabled = (year, month) => new Date(year, month + 1, 0) < minDate || new Date(year, month, 1) > maxDate;
  const canMoveMonth = (delta) => {
    const target = new Date(shown.year, shown.month + delta, 1);
    return !isMonthDisabled(target.getFullYear(), target.getMonth());
  };
  const moveMonth = (delta) => {
    const target = new Date(shown.year, shown.month + delta, 1);
    setShown({ year: target.getFullYear(), month: target.getMonth() });
  };
  const moveWeek = (delta) => {
    const next = new Date(selected);
    next.setDate(next.getDate() + delta * 7);
    select(next);
  };

  const dayCells = useMemo(() => {
    const offset = (new Date(shown.year, shown.month, 1).getDay() + 6) % 7;
    const cells = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth(shown.year, shown.month); d++) cells.push(new Date(shown.year, shown.month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [shown]);

  const years = useMemo(() => {
    const list = [];
    for (let y = maxDate.getFullYear(); y >= minDate.getFullYear(); y--) list.push(y);
    return list;
  }, [minDate, maxDate]);

  // Al abrir la vista de años se desplaza hasta el año elegido.
  useEffect(() => {
    if (mode !== "year" || !yearsRef.current) return;
    const button = yearsRef.current.querySelector(`[data-year="${selected.getFullYear()}"]`);
    button?.scrollIntoView({ block: "center" });
  }, [mode, selected]);

  // Escape cierra el selector sin cambiar el valor.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const confirm = () => {
    onChange?.({ target: { value: toValue(selected) } });
    setOpen(false);
  };

  const navButton = (enabled) =>
    `flex h-9 w-9 items-center justify-center rounded-full bg-[#3B6FCA]/10 text-[#3B6FCA] transition-colors ${
      enabled ? "hover:bg-[#3B6FCA]/20" : "cursor-not-allowed opacity-35"
    }`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}

      <button
        id={id}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={`flex w-full items-center gap-2.5 rounded-lg border bg-white text-left transition-all ${
          compact ? "px-3 py-2 text-[13px]" : "px-3.5 py-2.5 text-sm"
        } ${error ? "border-red-400" : "border-gray-200 hover:border-gray-300 focus:border-[#3B6FCA] focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/20"} ${
          disabled ? "cursor-not-allowed bg-gray-50 opacity-60" : ""
        }`}
      >
        <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span className={`flex-1 ${current ? "text-gray-800" : "text-gray-400"}`}>
          {current ? displayValue(current) : placeholder}
        </span>
      </button>
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label={label || "Seleccionar fecha"}
            className="w-full max-w-sm rounded-t-2xl bg-white px-5 pb-6 pt-3 shadow-xl sm:rounded-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <p className="truncate text-sm font-bold text-gray-900">{label || "Fecha"}</p>
              <button type="button" onClick={confirm} className="text-sm font-bold text-[#3B6FCA] hover:underline">Listo</button>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#3B6FCA]/10 px-3.5 py-2.5">
              <Calendar className="h-4 w-4 text-[#3B6FCA]" />
              <span className="text-[15px] font-bold text-gray-900">{longLabel(selected)}</span>
            </div>

            <div className="mb-3 flex rounded-xl bg-gray-100 p-1">
              {[["day", "Día"], ["month", "Mes"], ["year", "Año"]].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${
                    mode === key ? "bg-white text-[#3B6FCA] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>

            <div className="min-h-[320px]">
              {mode === "day" && (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <button type="button" className={navButton(canMoveMonth(-1))} disabled={!canMoveMonth(-1)} onClick={() => moveMonth(-1)} aria-label="Mes anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setMode("month")} className="rounded-md px-1 text-base font-bold text-gray-900 hover:bg-gray-100">{MONTHS[shown.month]}</button>
                      <button type="button" onClick={() => setMode("year")} className="rounded-md px-1 text-base font-bold text-[#3B6FCA] hover:bg-[#3B6FCA]/10">{shown.year}</button>
                    </div>
                    <button type="button" className={navButton(canMoveMonth(1))} disabled={!canMoveMonth(1)} onClick={() => moveMonth(1)} aria-label="Mes siguiente">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-1 grid grid-cols-7">
                    {WEEK_DAYS.map((d, i) => <span key={i} className="text-center text-[11px] font-bold text-gray-400">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {dayCells.map((date, i) => {
                      if (!date) return <span key={i} />;
                      const off = date < minDate || date > maxDate;
                      const isSelected = sameDay(date, selected);
                      const isToday = sameDay(date, today);
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={off}
                          onClick={() => select(date)}
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                            isSelected
                              ? "bg-[#3B6FCA] text-white"
                              : off
                                ? "cursor-not-allowed font-medium text-gray-300"
                                : `text-gray-800 hover:bg-[#3B6FCA]/10 ${isToday ? "ring-[1.5px] ring-[#3B6FCA]/60" : ""}`
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => moveWeek(-1)} className="flex items-center justify-center gap-1 rounded-lg border border-[#3B6FCA]/20 bg-[#3B6FCA]/5 py-2 text-xs font-bold text-[#3B6FCA] hover:bg-[#3B6FCA]/10">
                      <ChevronsLeft className="h-3.5 w-3.5" /> 1 semana
                    </button>
                    <button type="button" onClick={() => select(today)} className="rounded-lg bg-[#3B6FCA] py-2 text-xs font-bold text-white hover:bg-[#2d5ab5]">
                      Hoy
                    </button>
                    <button type="button" onClick={() => moveWeek(1)} className="flex items-center justify-center gap-1 rounded-lg border border-[#3B6FCA]/20 bg-[#3B6FCA]/5 py-2 text-xs font-bold text-[#3B6FCA] hover:bg-[#3B6FCA]/10">
                      1 semana <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {mode === "month" && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" className={navButton(shown.year - 1 >= minDate.getFullYear())} disabled={shown.year - 1 < minDate.getFullYear()} onClick={() => setShown((s) => ({ ...s, year: s.year - 1 }))} aria-label="Año anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setMode("year")} className="rounded-md px-1 text-base font-bold text-[#3B6FCA] hover:bg-[#3B6FCA]/10">{shown.year}</button>
                    <button type="button" className={navButton(shown.year + 1 <= maxDate.getFullYear())} disabled={shown.year + 1 > maxDate.getFullYear()} onClick={() => setShown((s) => ({ ...s, year: s.year + 1 }))} aria-label="Año siguiente">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {MONTHS_SHORT.map((text, month) => {
                      const off = isMonthDisabled(shown.year, month);
                      const isSelected = selected.getFullYear() === shown.year && selected.getMonth() === month;
                      return (
                        <button
                          key={text}
                          type="button"
                          disabled={off}
                          onClick={() => { select(withYearMonth(selected, shown.year, month)); setMode("day"); }}
                          className={`rounded-xl py-3.5 text-sm font-semibold transition-colors ${
                            isSelected ? "bg-[#3B6FCA] text-white" : off ? "cursor-not-allowed bg-gray-50 text-gray-300" : "bg-gray-100 text-gray-800 hover:bg-[#3B6FCA]/10"
                          }`}
                        >
                          {text}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {mode === "year" && (
                <div ref={yearsRef} className="grid max-h-[320px] grid-cols-4 gap-2.5 overflow-y-auto pr-1">
                  {years.map((year) => {
                    const isSelected = selected.getFullYear() === year;
                    return (
                      <button
                        key={year}
                        data-year={year}
                        type="button"
                        onClick={() => {
                          select(withYearMonth(selected, year, selected.getMonth()));
                          setShown({ year, month: selected.getMonth() });
                          setMode("month");
                        }}
                        className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                          isSelected ? "bg-[#3B6FCA] text-white" : "bg-gray-100 text-gray-800 hover:bg-[#3B6FCA]/10"
                        }`}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
