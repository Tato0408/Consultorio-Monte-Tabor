import { Check, AlertCircle } from "lucide-react";
import { summarizeSchedule } from "../lib/scheduleGrid";

// Encabezado de estado de la pantalla de disponibilidad. Responde de un
// vistazo a "ya me pueden agendar? en que dias y horas?". Sin dias
// disponibles se muestra en ambar con un boton que entra a modo edicion. Con
// dias, en verde y con el resumen del horario y el proximo dia especial.
const ScheduleStatusHero = ({ weeklyAvailability = [], breaks = [], exceptions = [], canEdit, onEdit }) => {
    const summary = summarizeSchedule(weeklyAvailability, breaks, exceptions);
    const ok = summary.anyDay;

    const detail = ok
        ? [
              summary.daysLabel && summary.hoursLabel
                  ? `Atiendes ${summary.daysLabel} de ${summary.hoursLabel}`
                  : summary.daysLabel
                  ? `Atiendes ${summary.daysLabel}`
                  : "",
              summary.pauseLabel,
              summary.nextException ? `Próximo día especial: ${summary.nextException}` : "",
          ]
              .filter(Boolean)
              .join(". ")
        : "Aún no defines tus días de atención. En cuanto enciendas al menos un día y guardes, los pacientes podrán reservar contigo.";

    return (
        <div
            className="rounded-2xl border shadow-sm px-5 py-4 sm:px-6 flex items-center gap-4"
            style={{
                background: ok ? "#f0fdf4" : "#fffbeb",
                borderColor: ok ? "#bbf7d0" : "#fde68a",
            }}
        >
            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: ok ? "#dcfce7" : "#fef3c7",
                    color: ok ? "#16a34a" : "#d97706",
                }}
            >
                {ok ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <AlertCircle className="w-5 h-5" strokeWidth={2.2} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold" style={{ color: ok ? "#15803d" : "#b45309" }}>
                    {ok ? "Los pacientes ya pueden agendar contigo" : "Todavía nadie puede agendar contigo"}
                </p>
                <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">{detail}</p>
            </div>
            {!ok && canEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex-shrink-0 px-4 py-2 rounded-lg border text-[13px] font-bold"
                    style={{ borderColor: "#2E6DA4", color: "#2E6DA4" }}
                >
                    Configurar ahora
                </button>
            )}
        </div>
    );
};

export default ScheduleStatusHero;
