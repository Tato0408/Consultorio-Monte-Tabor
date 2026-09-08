import { useMemo } from "react";
import { dayCellKinds, ROW_MINUTES, DAY_NAMES_SHORT } from "../lib/scheduleGrid";

// Cuadricula semanal de 7 columnas (Domingo a Sabado) por filas de 30 min.
// mode "edit" hace las celdas clickeables (llama a onPaintCell). mode "view"
// solo dibuja. El relleno ambar rayado son las pausas.

const AVAIL_FILL = "#ADD7F6";
const BREAK_FILL = "repeating-linear-gradient(45deg, #fbbf24, #fbbf24 3px, #fef3c7 3px, #fef3c7 6px)";

const cellBackground = (kind) => {
    if (kind === "avail") return AVAIL_FILL;
    if (kind === "break") return BREAK_FILL;
    return "#ffffff";
};

const hourLabel = (min) => {
    const h = Math.floor(min / 60);
    const suffix = h >= 12 ? "p" : "a";
    return `${h % 12 || 12}${suffix}`;
};

const WeekGrid = ({
    weeklyAvailability = [],
    breaks = [],
    startMin,
    rowCount,
    mode = "view",
    paintMode = "avail",
    onPaintCell,
}) => {
    const editable = mode === "edit";
    const cellH = editable ? 28 : 20;
    const headH = editable ? 30 : 24;

    // Tipo de celda por dia, recalculado cuando cambia la disponibilidad,
    // las pausas o la ventana horaria.
    const kindsByDay = useMemo(
        () =>
            DAY_NAMES_SHORT.map((_, dayIndex) => {
                const dayAvailability = weeklyAvailability.find((d) => d.day === dayIndex);
                const dayBreaks = breaks.filter((b) => b.day === dayIndex);
                return dayCellKinds(dayAvailability, dayBreaks, startMin, rowCount);
            }),
        [weeklyAvailability, breaks, startMin, rowCount]
    );

    const rows = Array.from({ length: rowCount });

    return (
        <div className="flex select-none">
            {/* Regleta de horas */}
            <div className="flex-shrink-0" style={{ width: editable ? 44 : 34 }}>
                <div style={{ height: headH }} />
                {rows.map((_, r) => {
                    const min = startMin + r * ROW_MINUTES;
                    const onHour = min % 60 === 0;
                    return (
                        <div
                            key={r}
                            className="flex items-start justify-end pr-1.5 text-[9px] text-slate-300"
                            style={{ height: cellH, transform: "translateY(-4px)" }}
                        >
                            {onHour ? hourLabel(min) : ""}
                        </div>
                    );
                })}
            </div>

            {/* 7 columnas de dias */}
            <div className="flex-1 border-l border-slate-200">
                <div className="grid grid-cols-7">
                    {DAY_NAMES_SHORT.map((name, dayIndex) => {
                        const dayAvailability = weeklyAvailability.find((d) => d.day === dayIndex);
                        const active = !!dayAvailability?.is_available;
                        return (
                            <div
                                key={name}
                                className="flex items-center justify-center text-[10px] font-bold border-r border-t border-b border-slate-200 bg-slate-50/60"
                                style={{ height: headH, color: active ? "#475569" : "#cbd5e1" }}
                            >
                                {name}
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-7">
                    {rows.map((_, r) =>
                        DAY_NAMES_SHORT.map((name, dayIndex) => {
                            const kind = kindsByDay[dayIndex][r];
                            return (
                                <div
                                    key={`${name}-${r}`}
                                    onClick={editable ? () => onPaintCell?.(dayIndex, r, paintMode) : undefined}
                                    className={`border-r border-b border-slate-100 ${editable ? "cursor-pointer" : ""}`}
                                    style={{ height: cellH, background: cellBackground(kind) }}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeekGrid;
