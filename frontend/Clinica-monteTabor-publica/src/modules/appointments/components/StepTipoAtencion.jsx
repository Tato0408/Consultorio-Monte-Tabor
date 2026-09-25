import { useState } from "react";
import { Stethoscope, FlaskConical, Syringe, ClipboardList, HeartPulse, Activity, Clock, CreditCard, ShieldCheck, Info, Search, Check } from "lucide-react";
import InfoSidebar from "./InfoSidebar";

// Se van rotando entre los procedimientos para que no se vean todos idénticos
const ICONOS = [Stethoscope, FlaskConical, Syringe, ClipboardList, HeartPulse, Activity];
const COLORES = [
  { bg: "bg-blue-50", text: "text-blue-500" },
  { bg: "bg-purple-50", text: "text-purple-500" },
  { bg: "bg-emerald-50", text: "text-emerald-500" },
  { bg: "bg-amber-50", text: "text-amber-500" },
  { bg: "bg-rose-50", text: "text-rose-500" },
  { bg: "bg-cyan-50", text: "text-cyan-500" },
];

const INFO_ITEMS = [
  { icon: Clock, title: "Duración promedio", description: "Las consultas generales duran aproximadamente 30 minutos." },
  { icon: CreditCard, title: "Formas de pago", description: "Puedes pagar en efectivo o con tarjeta directamente en recepción, el día de tu cita." },
  { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada, desde 'Mis citas'." },
];

const CheckBox = ({ selected }) => (
  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-[#3B6FCA] bg-[#3B6FCA]" : "border-gray-200"}`}>
    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
  </div>
);

// Paso 1: el paciente elige uno o más procedimientos del catálogo (incluida la Consulta
// Médica General, que es un procedimiento real más, no un caso especial fuera del
// catálogo). selected es un array de ids; onSelect(id) agrega o quita ese id de la
// selección (no la reemplaza). La duración y el precio de la cita son la suma de todos
// los elegidos, ver el resumen al pie de la lista.
const StepTipoAtencion = ({ procedures, selected, onSelect }) => {
  const [busqueda, setBusqueda] = useState("");
  const procedimientosFiltrados = busqueda.trim()
    ? procedures.filter((p) => p.name.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : procedures;

  const seleccionados = procedures.filter((p) => selected.includes(p._id));
  const duracionTotal = seleccionados.reduce((sum, p) => sum + (Number(p.estimated_duration) || 30), 0);
  const precioTotal = seleccionados.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <InfoSidebar
        hero={
          <>
            <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center mb-3">
              <HeartPulse className="w-5 h-5 text-[#3B6FCA]" />
            </div>
            <p className="font-bold text-gray-900">Tu salud es nuestra prioridad</p>
            <p className="text-sm text-gray-500 mt-1">Agenda tu cita de manera rápida y segura.</p>
          </>
        }
        items={{ tipo: "importante", list: INFO_ITEMS }}
      />

      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Selecciona el tipo de atención</h2>
        <p className="text-sm text-gray-500 mb-4">Elige una opción para continuar.</p>

        {procedures.length > 0 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar procedimiento por nombre..."
              maxLength={100}
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#3B6FCA] focus:bg-white transition-colors"
            />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {procedimientosFiltrados.map((p, i) => {
            const Icon = ICONOS[i % ICONOS.length];
            const color = COLORES[i % COLORES.length];
            const isSelected = selected.includes(p._id);
            return (
              <button
                key={p._id}
                type="button"
                onClick={() => onSelect(p._id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected ? "border-[#3B6FCA] bg-[#3B6FCA]/5" : "border-gray-100 hover:border-[#3B6FCA]/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color.text}`} />
                  </div>
                  <CheckBox selected={isSelected} />
                </div>
                <p className="font-semibold text-gray-800">{p.name}</p>
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="w-3.5 h-3.5" /> {p.estimated_duration ? `${p.estimated_duration} min` : "—"}
                  </span>
                  <span className="font-bold text-[#3B6FCA]">${Number(p.price || 0).toFixed(2)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {seleccionados.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-xl px-4 py-3 mt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                {seleccionados.length === 1 ? "1 procedimiento seleccionado" : `${seleccionados.length} procedimientos seleccionados`}
              </p>
              <p className="text-xs text-gray-500 truncate">{seleccionados.map((p) => p.name).join(", ")}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[#3B6FCA]">${precioTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {duracionTotal} min</p>
            </div>
          </div>
        )}

        {procedures.length === 0 && (
          <div className="flex items-start gap-2 bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-xl p-4 mt-4">
            <Info className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Por ahora no hay procedimientos disponibles. Vuelve a intentarlo más tarde.
            </p>
          </div>
        )}

        {procedures.length > 0 && procedimientosFiltrados.length === 0 && (
          <div className="flex items-start gap-2 bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-xl p-4 mt-4">
            <Info className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Ningún procedimiento coincide con "{busqueda.trim()}". Prueba con otro término.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepTipoAtencion;
