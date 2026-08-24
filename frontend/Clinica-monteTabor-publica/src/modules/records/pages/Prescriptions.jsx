import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2, Download, Pill } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPrescriptions } from "@/services/patientPortalService";
import { showError } from "@/lib/alerts";
import { descargarRecetaPdf } from "@/lib/pdf/patientDocuments";

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—";

// Recetas médicas reales del paciente (generadas por el doctor durante una consulta)
const Prescriptions = () => {
  const { patient } = useAuth();
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrescriptions()
      .then(setRecetas)
      .catch(() => showError("No se pudieron cargar tus recetas."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </Link>
        <span className="font-semibold text-gray-800 text-sm">Mis recetas</span>
        <div className="w-16" />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : recetas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">Todavía no tienes recetas médicas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recetas.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{fmtFecha(r.issued_at)}</p>
                    {r.doctor && <p className="text-sm text-gray-500">Dr. {r.doctor.name} {r.doctor.last_name}</p>}
                  </div>
                  <button
                    onClick={() => descargarRecetaPdf(patient, r)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#3B6FCA] hover:underline flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                  {r.medications.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Pill className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">{m.name} {m.dose}</p>
                        <p className="text-gray-500">{m.frequency} — {m.duration}</p>
                        {m.instructions && <p className="text-gray-400 text-xs mt-0.5">{m.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {r.post_operative_instructions && (
                  <p className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500">{r.post_operative_instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Prescriptions;