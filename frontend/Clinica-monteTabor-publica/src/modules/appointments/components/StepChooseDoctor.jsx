import { useState, useEffect } from "react";
import { User, Loader2, AlertCircle, CalendarClock, UserCheck, ShieldCheck } from "lucide-react";
import { getSchedulableDoctors, getSchedulableNurses } from "@/services/appointmentsService";
import InfoSidebar from "./InfoSidebar";

// Paso "elegir doctor" (o "elegir enfermera" cuando requiresDoctor es false, ver más
// abajo) del modo doctor primero: a diferencia del modo rápido (donde el proveedor se
// resuelve después de elegir un horario), aquí el paciente elige un proveedor puntual
// antes de ver fecha y hora, y el siguiente paso filtra el calendario según el horario
// de ese proveedor. Solo se listan proveedores con horario ya configurado
// (getSchedulableDoctors/getSchedulableNurses), porque sin horario no hay días ni
// horas que calcular.
const StepChooseDoctor = ({ tipoLabel, tipoDescription, selected, onSelect, requiresDoctor = true }) => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const fetchProveedores = requiresDoctor ? getSchedulableDoctors : getSchedulableNurses;
    fetchProveedores()
      .then((res) => setProveedores(res || []))
      .catch(() => setError(requiresDoctor ? "No se pudieron cargar los doctores disponibles." : "No se pudieron cargar las enfermeras disponibles."))
      .finally(() => setLoading(false));
  }, [requiresDoctor]);

  const infoItems = requiresDoctor
    ? [
        { icon: UserCheck, title: "Elige tu doctor", description: "Solo se muestran los doctores que ya tienen horario configurado." },
        { icon: CalendarClock, title: "Después, la fecha", description: "En el siguiente paso verás los días y horas que ese doctor atiende." },
        { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada." },
      ]
    : [
        { icon: UserCheck, title: "Elige tu enfermera", description: "Solo se muestran las enfermeras que ya tienen horario configurado." },
        { icon: CalendarClock, title: "Después, la fecha", description: "En el siguiente paso verás los días y horas que esa enfermera atiende." },
        { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada." },
      ];

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
        items={{ tipo: "útil", list: infoItems }}
      />

      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{requiresDoctor ? "Elige tu doctor" : "Elige tu enfermera"}</h2>
          <p className="text-sm text-gray-500">
            {requiresDoctor
              ? "En el siguiente paso verás los días y horarios disponibles de este doctor."
              : "En el siguiente paso verás los días y horarios disponibles de esta enfermera."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#3B6FCA]" /> {requiresDoctor ? "Cargando doctores..." : "Cargando enfermeras..."}
          </div>
        ) : error || proveedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <AlertCircle className="w-8 h-8 text-amber-300" />
            <p className="text-sm text-gray-500">
              {error || (requiresDoctor ? "No hay doctores con horario configurado por el momento." : "No hay enfermeras con horario configurado por el momento.")}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedores.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => onSelect(p)}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all ${
                  selected?._id === p._id ? "border-[#3B6FCA] bg-[#3B6FCA]/5" : "border-gray-100 hover:border-[#3B6FCA]/40"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden mb-3 flex-shrink-0">
                  {p.img_url ? (
                    <img src={p.img_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-[#3B6FCA]" />
                  )}
                </div>
                <p className="font-semibold text-gray-800">{requiresDoctor ? `Dr. ${p.name} ${p.last_name}` : `${p.name} ${p.last_name}`}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepChooseDoctor;
