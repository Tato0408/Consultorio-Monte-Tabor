import { useState, useMemo } from "react";
import { Search, User, Clock, CalendarClock, ShieldCheck, UserRoundSearch } from "lucide-react";
import InfoSidebar from "./InfoSidebar";

const INFO_ITEMS = [
  { icon: Clock, title: "Duración aproximada", description: "Depende de la atención elegida." },
  { icon: CalendarClock, title: "Disponibilidad", description: "Cada doctor tiene su propio horario; lo verás en el siguiente paso." },
  { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada." },
];

// Paso 2: el paciente elige con qué doctor quiere agendar
const StepDoctor = ({ doctors, tipoLabel, tipoDescription, selected, onSelect }) => {
  const [busqueda, setBusqueda] = useState("");

  const doctoresFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter((d) => `${d.name} ${d.last_name}`.toLowerCase().includes(term));
  }, [doctors, busqueda]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <InfoSidebar
        hero={
          <>
            <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-[#3B6FCA]" />
            </div>
            <p className="font-bold text-gray-900">{tipoLabel}</p>
            {tipoDescription && <p className="text-sm text-gray-500 mt-1">{tipoDescription}</p>}
          </>
        }
        items={{ tipo: "útil", list: INFO_ITEMS }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Elige un doctor</h2>
            <p className="text-sm text-gray-500">Estos son los doctores disponibles en la clínica.</p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar doctor"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
            />
          </div>
        </div>

        {doctoresFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No encontramos doctores con ese nombre.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctoresFiltrados.map((d) => (
              <button
                key={d._id}
                type="button"
                onClick={() => onSelect(d._id)}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all ${
                  selected === d._id ? "border-[#3B6FCA] bg-[#3B6FCA]/5" : "border-gray-100 hover:border-[#3B6FCA]/40"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden mb-3 flex-shrink-0">
                  {d.img_url ? (
                    <img src={d.img_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-[#3B6FCA]" />
                  )}
                </div>
                <p className="font-semibold text-gray-800">Dr. {d.name} {d.last_name}</p>
              </button>
            ))}

            <div className="flex flex-col items-center text-center p-5 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <UserRoundSearch className="w-6 h-6 text-gray-300" />
              </div>
              <p className="font-semibold text-sm text-gray-700">¿No encuentras a tu doctor?</p>
              <p className="text-xs text-gray-400 mt-1">Muy pronto habrá más doctores disponibles para agendar en línea.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepDoctor;