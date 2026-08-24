import { Check } from "lucide-react";

// Etiquetas por modo: en el modo rápido no hay paso de doctor (queda sin asignar,
// cualquier doctor disponible la acepta); en el modo doctor primero sí, y la fecha y
// hora pasa a ser el paso siguiente en vez del segundo.
const PASOS_POR_MODO = {
  rapido: ["Tipo de atención", "Fecha y hora", "Confirmar"],
  doctor: ["Tipo de atención", "Doctor", "Fecha y hora", "Confirmar"],
};

// Indicador visual del paso actual del wizard de agendamiento. La lista de pasos
// depende del modo elegido dentro del paso 2 (ver ModeToggle en NewAppointment.jsx).
const StepIndicator = ({ current, modo = "rapido" }) => {
  const pasos = PASOS_POR_MODO[modo] || PASOS_POR_MODO.rapido;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10 flex-wrap">
      {pasos.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? "bg-[#3B6FCA] border-[#3B6FCA] text-white"
                    : active
                    ? "border-[#3B6FCA] text-[#3B6FCA] bg-white shadow-[0_0_0_4px_rgba(59,111,202,0.15)]"
                    : "border-gray-200 text-gray-300 bg-white"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-[11px] font-medium hidden sm:block ${active || done ? "text-gray-700" : "text-gray-300"}`}>
                {label}
              </span>
            </div>
            {step < pasos.length && (
              <div className={`w-6 sm:w-12 h-0.5 rounded-full transition-colors ${done ? "bg-[#3B6FCA]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
