import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Clock, ChevronLeft, ChevronRight, CalendarDays, Sun, Sunset, Moon, Info } from "lucide-react";
import {
  getPatientAvailableSlots, getAvailableSlots, getDoctorWorkingDays,
  getNurseAvailableSlots, getNurseWorkingDays,
} from "@/services/appointmentsService";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Convierte una fecha a "YYYY-MM-DD" usando hora LOCAL (evita que el día cambie por UTC)
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFechaLarga = (d) =>
  d.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Arma los próximos "n" días a partir de hoy, para que el paciente elija uno
const buildDays = (n = 30) => {
  const dias = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
};

// Agrupa los horarios en Mañana / Tarde / Noche según la hora de inicio
const agruparPorFranja = (slots) => {
  const grupos = { manana: [], tarde: [], noche: [] };
  for (const s of slots) {
    const hora = Number(s.start_time.split(":")[0]);
    if (hora < 12) grupos.manana.push(s);
    else if (hora < 18) grupos.tarde.push(s);
    else grupos.noche.push(s);
  }
  return grupos;
};

// Paso de fecha y hora. Funciona en tres modos:
// - Modo agregado (ni doctor ni nurse definidos): hora libre entre todos los doctores
//   (o todas las enfermeras, si el procedimiento no requiere doctor: ver
//   requiresDoctorForProcedure en NewAppointment.jsx) según el tipo de atención elegido
//   (define la duración). El proveedor se elige después, en base al horario que se
//   elija aquí (modo "rápido" del asistente). Este modo no cambia con este ticket: el
//   endpoint agregado ya resuelve solo si aplica a doctores o enfermeras.
// - Modo doctor puntual (doctor definido): horarios de ESE doctor para el día elegido.
// - Modo enfermera puntual (nurse definido, solo posible cuando el procedimiento no
//   requiere doctor): mismo tratamiento que el modo doctor puntual, pero contra los
//   endpoints de horario de enfermera. doctor y nurse nunca llegan definidos a la vez.
//   Los días que el proveedor no atiende (o dejó sin marcar en su horario) aparecen
//   bloqueados en el selector de fecha, igual que se ve en Horarios del panel privado.
//   duration (minutos) es obligatorio en modo doctor/enfermera puntual, porque esos
//   endpoints de slots no resuelven la duración a partir de un procedimiento.
const StepFechaHora = ({ procedureId, duration, doctor, nurse, date, slot, onSelectDate, onSelectSlot }) => {
  const dias = useMemo(() => buildDays(), []);
  const scrollRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  // null mientras no se sabe todavía (o en modo agregado, donde no aplica ningún bloqueo)
  const [workingDays, setWorkingDays] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  // true mientras no se sabe todavía (no bloquea de más antes de tener la respuesta): si
  // hoy ya no le queda ningún horario disponible (todos ya pasaron, o el día está
  // completo), el botón de hoy debe verse deshabilitado en el selector de fecha, igual
  // que un día no laborable. Se resuelve aparte de "slots" (que solo trae el día ya
  // seleccionado) porque hace falta saberlo ANTES de que el paciente elija un día: al
  // montar este paso, date todavía es null.
  const [todayHasSlots, setTodayHasSlots] = useState(true);

  // Proveedor puntual de este paso (doctor o enfermera, nunca ambos), o undefined en
  // modo agregado.
  const provider = doctor || nurse;

  useEffect(() => {
    if (!provider) {
      setWorkingDays(null);
      setExceptions([]);
      return;
    }
    const fetchWorkingDays = doctor ? getDoctorWorkingDays : getNurseWorkingDays;
    fetchWorkingDays(provider._id)
      .then((res) => {
        setWorkingDays(res.workingDays || []);
        setExceptions(res.exceptions || []);
      })
      .catch(() => {
        setWorkingDays([]);
        setExceptions([]);
      });
  }, [provider, doctor]);

  // Consulta los horarios de HOY (sin importar cuál día esté seleccionado) solo para saber
  // si ya no le queda ninguno disponible, y así poder deshabilitar su botón en el selector
  // de fecha. Se dispara al montar y cada vez que cambia el proveedor/procedimiento/
  // duración, igual que el efecto de arriba, pero de forma independiente al día elegido.
  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    setTodayHasSlots(true);
    // Sin abortar la petición anterior, un cambio rápido de proveedor/procedimiento podía
    // dejar que una respuesta vieja llegara después que la nueva y sobrescribiera
    // todayHasSlots con un resultado que ya no corresponde a la selección actual.
    const controller = new AbortController();
    const solicitud = doctor
      ? getAvailableSlots(doctor._id, toDateStr(hoy), duration, controller.signal)
      : nurse
        ? getNurseAvailableSlots(nurse._id, toDateStr(hoy), duration, controller.signal)
        : getPatientAvailableSlots(toDateStr(hoy), procedureId, controller.signal);
    solicitud
      .then((res) => {
        const ahoraCheck = new Date();
        const minutosActualesCheck = ahoraCheck.getHours() * 60 + ahoraCheck.getMinutes();
        const quedanHorarios = (res.slots || []).some((s) => {
          const [h, m] = s.start_time.split(":").map(Number);
          return h * 60 + m > minutosActualesCheck;
        });
        setTodayHasSlots(quedanHorarios);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setTodayHasSlots(true);
      });
    return () => controller.abort();
  }, [procedureId, doctor, nurse, duration]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setMensaje("");
    // Mismo criterio que el efecto de arriba: se aborta la petición anterior para que una
    // respuesta tardía de una fecha/proveedor ya abandonados no sobrescriba los horarios
    // mostrados con los de una selección distinta a la actual.
    const controller = new AbortController();
    const solicitud = doctor
      ? getAvailableSlots(doctor._id, toDateStr(date), duration, controller.signal)
      : nurse
        ? getNurseAvailableSlots(nurse._id, toDateStr(date), duration, controller.signal)
        : getPatientAvailableSlots(toDateStr(date), procedureId, controller.signal);
    solicitud
      .then((res) => {
        setSlots(res.slots || []);
        setMensaje(res.message || "");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSlots([]);
        setMensaje("No se pudieron cargar los horarios.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [procedureId, date, doctor, nurse, duration]);

  // Una excepción de tipo vacaciones o día no laborable bloquea ese rango de fechas
  // completo. "special_hours" no bloquea el día, solo cambia el horario dentro de él
  // (eso ya lo resuelve el propio cálculo de slots del servidor).
  const fechaDentroDeExcepcionBloqueante = (d) => {
    const str = toDateStr(d);
    return exceptions.some((ex) => {
      if (ex.type === "special_hours") return false;
      const desde = toDateStr(new Date(ex.date));
      const hasta = ex.end_date ? toDateStr(new Date(ex.end_date)) : desde;
      return str >= desde && str <= hasta;
    });
  };

  // Hoy se deshabilita aparte, sin importar el modo, si ya no le queda ningún horario
  // disponible (todos ya pasaron, o el día está completo). En modo agregado ningún otro
  // día se deshabilita. En modo doctor/enfermera puntual, además se deshabilita si su día
  // de la semana no está marcado como laborable o si cae en una excepción. Mientras
  // workingDays todavía no llega (null), no se bloquea nada de eso para no parpadear.
  const diaDeshabilitado = (d) => {
    if (toDateStr(d) === toDateStr(new Date()) && !todayHasSlots) return true;
    if (!provider || workingDays === null) return false;
    if (!workingDays.includes(d.getDay())) return true;
    return fechaDentroDeExcepcionBloqueante(d);
  };

  // Si el día elegido es hoy, oculta los horarios que ya pasaron
  const ahora = new Date();
  const esHoy = date && date.toDateString() === ahora.toDateString();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const slotsVisibles = esHoy
    ? slots.filter((s) => {
        const [h, m] = s.start_time.split(":").map(Number);
        return h * 60 + m > minutosActuales;
      })
    : slots;

  const franjas = agruparPorFranja(slotsVisibles);
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Elige la fecha y hora</h2>
      <p className="text-sm text-gray-500 mb-6">
        {doctor
          ? `Días y horarios disponibles de Dr. ${doctor.name} ${doctor.last_name}.`
          : nurse
            ? `Días y horarios disponibles de ${nurse.name} ${nurse.last_name}.`
            : "Se muestran los horarios donde al menos un doctor está disponible."}
      </p>

      <p className="text-sm font-semibold text-gray-700 mb-3">Selecciona un día</p>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => scroll(-1)} className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-[#3B6FCA] hover:text-[#3B6FCA] flex-shrink-0 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {dias.map((d) => {
            const isSelected = date && toDateStr(d) === toDateStr(date);
            const disabled = diaDeshabilitado(d);
            return (
              <button
                key={toDateStr(d)}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelectDate(d);
                  onSelectSlot(null);
                }}
                className={`flex flex-col items-center justify-center flex-shrink-0 w-14 h-16 rounded-xl border-2 transition-all ${
                  disabled
                    ? "border-gray-100 text-gray-300 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-[#3B6FCA] border-[#3B6FCA] text-white"
                    : "border-gray-100 text-gray-600 hover:border-[#3B6FCA]/40"
                }`}
              >
                <span className="text-[10px] uppercase font-medium opacity-80">{DIAS[d.getDay()]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
                <span className="text-[9px] opacity-70">{MESES[d.getMonth()]}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => scroll(1)} className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-[#3B6FCA] hover:text-[#3B6FCA] flex-shrink-0 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {date && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5 mb-6 text-sm font-medium text-gray-700 capitalize">
          <CalendarDays className="w-4 h-4 text-[#3B6FCA] flex-shrink-0" /> {fmtFechaLarga(date)}
        </div>
      )}

      <p className="text-sm font-semibold text-gray-700 mb-3">Selecciona un horario disponible</p>
      {!date ? (
        <p className="text-sm text-gray-400 py-6 text-center">Selecciona primero un día.</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#3B6FCA]" /> Cargando horarios...
        </div>
      ) : slotsVisibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Clock className="w-8 h-8 text-gray-200" />
          <p className="text-sm text-gray-400">{mensaje || "Sin horarios disponibles para este día."}</p>
          <p className="text-xs text-gray-300">Prueba eligiendo otro día.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {[
            { key: "manana", label: "Mañana", icon: Sun },
            { key: "tarde", label: "Tarde", icon: Sunset },
            { key: "noche", label: "Noche", icon: Moon },
          ].map(({ key, label, icon: Icon }) =>
            franjas[key].length === 0 ? null : (
              <div key={key}>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {franjas[key].map((s, i) => {
                    // available solo llega en modo doctor puntual (ver StepFechaHora ->
                    // getAvailableSlots con includeBooked). En modo agregado siempre es
                    // undefined y el slot es seleccionable, porque ahí solo se muestran
                    // horarios donde al menos un doctor sigue libre.
                    const ocupado = s.available === false;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={ocupado}
                        onClick={() => !ocupado && onSelectSlot(s)}
                        title={ocupado ? "Este horario ya está ocupado" : undefined}
                        className={`py-2.5 rounded-xl border-2 transition-all ${
                          ocupado
                            ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
                            : slot?.start_time === s.start_time
                            ? "bg-[#3B6FCA] border-[#3B6FCA] text-white"
                            : "border-gray-100 text-gray-600 hover:border-[#3B6FCA]/40"
                        }`}
                      >
                        <span className={`block text-sm font-semibold ${ocupado ? "line-through" : ""}`}>{fmt12(s.start_time)}</span>
                        <span className={`block text-[11px] ${
                          ocupado ? "text-gray-300" : slot?.start_time === s.start_time ? "text-white/70" : "text-gray-400"
                        }`}>
                          {ocupado ? "Ocupado" : `hasta ${fmt12(s.end_time)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* En modo agregado (sin proveedor puntual) la cita queda sin asignar: la puede
          aceptar cualquier doctor (o enfermera) disponible para ese horario. En modo
          doctor/enfermera puntual ya se sabe quién atiende, así que este aviso no aplica. */}
      {slotsVisibles.length > 0 && !provider && (
        <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 mt-6">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          {/* Este componente no sabe si el modo agregado resolvió contra doctores o
              enfermeras (esa decisión la toma el backend de forma transparente, ver
              getPatientAvailableSlots), así que el aviso usa un término genérico en vez
              de asumir "doctor". */}
          <p className="text-xs text-gray-500">Tu cita quedará pendiente de que cualquier profesional disponible la acepte.</p>
        </div>
      )}
    </div>
  );
};

export default StepFechaHora;