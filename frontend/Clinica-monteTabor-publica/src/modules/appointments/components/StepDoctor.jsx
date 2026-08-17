import { useState, useEffect } from "react";
import { User, Clock, CalendarClock, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { getDoctorsForSlot } from "@/services/appointmentsService";
import InfoSidebar from "./InfoSidebar";

const INFO_ITEMS = [
  { icon: Clock, title: "Duración aproximada", description: "Depende de la atención elegida." },
  { icon: CalendarClock, title: "Disponibilidad", description: "Solo se muestran los doctores libres en el horario que elegiste." },
  { icon: ShieldCheck, title: "Cancelaciones", description: "Puedes cancelar tu cita en cualquier momento antes de la hora agendada." },
];

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Paso 3: doctores que pueden atender el horario ya elegido en el paso
// anterior. Si hay uno solo se autoselecciona; si hay varios, el paciente
// elige entre ellos.
const StepDoctor = ({ date, slot, procedureId, tipoLabel, tipoDescription, selected, onSelect }) => {
  const [doctores, setDoctores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date || !slot) return;
    setLoading(true);
    setError("");
    getDoctorsForSlot(toDateStr(date), slot.start_time, procedureId)
      .then((res) => {
        const encontrados = res.doctors || [];
        setDoctores(encontrados);
        if (encontrados.length === 1) onSelect(encontrados[0]);
      })
      .catch(() => {
        setDoctores([]);
        setError("No se pudieron cargar los doctores disponibles para ese horario.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slot, procedureId]);

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
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {doctores.length > 1 ? "Elige un doctor" : "Tu doctor para este horario"}
          </h2>
          <p className="text-sm text-gray-500">
            {doctores.length > 1
              ? "Varios doctores pueden atenderte en el horario que elegiste."
              : "Este es el doctor disponible en el horario que elegiste."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#3B6FCA]" /> Buscando doctores disponibles...
          </div>
        ) : error || doctores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <AlertCircle className="w-8 h-8 text-amber-300" />
            <p className="text-sm text-gray-500">{error || "Ese horario ya no tiene doctores disponibles."}</p>
            <p className="text-xs text-gray-400">Vuelve al paso anterior y elige otro horario.</p>
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

export default StepDoctor;
