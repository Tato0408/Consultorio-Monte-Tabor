import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2, Download, FileText, FileStack } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPrescriptions, getSickLeaves, getReferrals } from "@/services/patientPortalService";
import { showError } from "@/lib/alerts";
import { downloadTextFile } from "@/lib/downloadFile";
import { descargarIncapacidadPdf, descargarRecetaPdf } from "@/lib/pdf/patientDocuments";

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—";

const TIPO_LABEL = { receta: "Receta médica", incapacidad: "Incapacidad médica", referencia: "Referencia médica" };
const TIPO_COLOR = { receta: "text-red-400", incapacidad: "text-[#3B6FCA]", referencia: "text-emerald-500" };

// Misma regla que usePatientRecordDetail.js (expediente clínico, web privada): vigente
// mientras la fecha de finalización no haya pasado, o no exista (registros antiguos sin
// end_date, que se asumen vigentes por no tener forma de saber lo contrario).
const isSickLeaveVigente = (endDate) => {
  if (!endDate) return true;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
};

// Arma el texto descargable de una referencia médica — recetas e incapacidades ya
// generan un PDF con formato real (ver descargarIncapacidadPdf/descargarRecetaPdf), no
// hay un formato de referencia definido todavía, así que se queda en texto plano.
const buildTexto = (doc) => {
  const lineas = [
    "CLÍNICA FAMILIAR MONTE TABOR",
    TIPO_LABEL[doc.type],
    `Fecha: ${fmtFecha(doc.date)}`,
    doc.doctor ? `Doctor: Dr. ${doc.doctor.name} ${doc.doctor.last_name}` : "",
    "",
    `Motivo: ${doc.reason}`,
    `Referido a: ${doc.referred_to || "—"}`,
    `Estado: ${doc.status}`,
  ];
  return lineas.filter(Boolean).join("\n");
};

// Reúne recetas, incapacidades y referencias médicas reales del paciente en una sola vista
const Documents = () => {
  const { patient } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [sickLeaves, setSickLeaves] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // allSettled: si una de las tres categorías falla, las otras dos igual se muestran
    Promise.allSettled([getPrescriptions(), getSickLeaves(), getReferrals()]).then(([p, s, r]) => {
      if (p.status === "fulfilled") setPrescriptions(p.value);
      if (s.status === "fulfilled") setSickLeaves(s.value);
      if (r.status === "fulfilled") setReferrals(r.value);

      if (p.status === "rejected" || s.status === "rejected" || r.status === "rejected") {
        showError("Algunos documentos no se pudieron cargar.");
      }

      setLoading(false);
    });
  }, []);

  const documentos = useMemo(() => {
    const todos = [
      // raw: se conserva el documento completo (medicamentos, órdenes de laboratorio,
      // indicaciones) para poder armar el PDF real al descargar, sin perder esos campos
      // en el aplanado que usa esta lista.
      ...prescriptions.map((p) => ({ type: "receta", date: p.issued_at, doctor: p.doctor, medications: p.medications, raw: p })),
      ...sickLeaves.map((s) => ({ type: "incapacidad", date: s.start_date, doctor: s.doctor_id, diagnosis: s.diagnosis, start_date: s.start_date, end_date: s.end_date, status: s.status, raw: s })),
      ...referrals.map((r) => ({ type: "referencia", date: r.date, doctor: r.doctor, reason: r.reason, referred_to: r.referred_to, status: r.status })),
    ];
    return todos.filter((d) => d.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [prescriptions, sickLeaves, referrals]);

  const descargar = (doc) => {
    if (doc.type === "receta") return descargarRecetaPdf(patient, doc.raw);
    if (doc.type === "incapacidad") return descargarIncapacidadPdf(patient, doc.raw);
    return downloadTextFile(`${doc.type}-${fmtFecha(doc.date)}.txt`, buildTexto(doc));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </Link>
        <span className="font-semibold text-gray-800 text-sm">Documentos</span>
        <div className="w-16" />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-20">
            <FileStack className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Todavía no tienes documentos disponibles.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentos.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileText className={`w-5 h-5 ${TIPO_COLOR[d.type]}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate flex items-center gap-2">
                      {TIPO_LABEL[d.type]}
                      {d.type === "incapacidad" && (
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isSickLeaveVigente(d.end_date) ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isSickLeaveVigente(d.end_date) ? "Vigente" : "No vigente"}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {d.doctor ? `Dr. ${d.doctor.name} ${d.doctor.last_name} — ` : ""}{fmtFecha(d.date)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => descargar(d)}
                  className="p-2 rounded-lg hover:bg-gray-50 text-[#3B6FCA] flex-shrink-0"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;