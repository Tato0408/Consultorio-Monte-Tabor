import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Clock, ChevronLeft, ChevronRight, CalendarDays, Sun, Sunset, Moon, Info } from "lucide-react";
import { getAvailableSlots } from "@/services/appointmentsService";

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

// Paso 3: elegir día y luego una hora libre para ese día, según el doctor y la duración elegidos
const StepFechaHora = ({ doctorId, duration, date, slot, onSelectDate, onSelectSlot }) => {
  const dias = useMemo(() => buildDays(), []);
  const scrollRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!doctorId || !date) return;
    setLoading(true);
    setMensaje("");
    getAvailableSlots(doctorId, toDateStr(date), duration)
      .then((res) => {
        setSlots(res.slots || []);
        setMensaje(res.message || "");
      })
      .catch(() => {
        setSlots([]);
        setMensaje("No se pudieron cargar los horarios.");
      })
      .finally(() => setLoading(false));
  }, [doctorId, date, duration]);

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
      <p className="text-sm text-gray-500 mb-6">Solo se muestran los horarios realmente disponibles del doctor.</p>

      <p className="text-sm font-semibold text-gray-700 mb-3">Selecciona un día</p>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => scroll(-1)} className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-[#3B6FCA] hover:text-[#3B6FCA] flex-shrink-0 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {dias.map((d) => {
            const isSelected = date && toDateStr(d) === toDateStr(date);
            return (
              <button
                key={toDateStr(d)}
                type="button"
                onClick={() => {
                  onSelectDate(d);
                  onSelectSlot(null);
                }}
                className={`flex flex-col items-center justify-center flex-shrink-0 w-14 h-16 rounded-xl border-2 transition-all ${
                  isSelected ? "bg-[#3B6FCA] border-[#3B6FCA] text-white" : "border-gray-100 text-gray-600 hover:border-[#3B6FCA]/40"
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
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {franjas[key].map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSelectSlot(s)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        slot?.start_time === s.start_time
                          ? "bg-[#3B6FCA] border-[#3B6FCA] text-white"
                          : "border-gray-100 text-gray-600 hover:border-[#3B6FCA]/40"
                      }`}
                    >
                      {fmt12(s.start_time)}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {slotsVisibles.length > 0 && (
        <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 mt-6">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">Los horarios mostrados corresponden a la disponibilidad real del doctor seleccionado.</p>
        </div>
      )}
    </div>
  );
};

export default StepFechaHora;