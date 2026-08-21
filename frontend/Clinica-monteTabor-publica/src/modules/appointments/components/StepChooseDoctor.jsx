import { useState, useEffect } from "react";
import { User, Loader2, AlertCircle, CalendarClock, UserCheck, ShieldCheck } from "lucide-react";
import { getSchedulableDoctors } from "@/services/appointmentsService";
import InfoSidebar from "./InfoSidebar";

const INFO_ITEMS = [
  { icon: UserCheck, title: "Elige tu doctor", description: "Solo se muestran los doctores que ya tienen horario configurado." },
  { icon: CalendarClock, title: "Después, la fecha", description: "En el siguiente paso verás los días y horas que ese doctor atiende." },
  { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada." },
];

// Paso "elegir doctor" del modo doctor primero: a diferencia del modo rápido (donde el
// doctor se resuelve después de elegir un horario), aquí el paciente elige doctor antes
// de ver fecha y hora, y el siguiente paso filtra el calendario según el horario de este
// doctor puntual. Solo se listan doctores con horario ya configurado (getSchedulableDoctors),
// porque sin horario no hay días ni horas que calcular.
const StepChooseDoctor = ({ tipoLabel, tipoDescription, selected, onSelect }) => {
  const [doctores, setDoctores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getSchedulableDoctors()
      .then((res) => setDoctores(res || []))
      .catch(() => setError("No se pudieron cargar los doctores disponibles."))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Elige tu doctor</h2>
          <p className="text-sm text-gray-500">En el siguiente paso verás los días y horarios disponibles de este doctor.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#3B6FCA]" /> Cargando doctores...
          </div>
        ) : error || doctores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <AlertCircle className="w-8 h-8 text-amber-300" />
            <p className="text-sm text-gray-500">{error || "No hay doctores con horario configurado por el momento."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctores.map((d) => (
              <button
                key={d._id}
                type="button"
                onClick={() => onSelect(d)}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all ${
                  selected?._id === d._id ? "border-[#3B6FCA] bg-[#3B6FCA]/5" : "border-gray-100 hover:border-[#3B6FCA]/40"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default StepChooseDoctor;
