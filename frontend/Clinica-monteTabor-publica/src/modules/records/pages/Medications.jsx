import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, Loader2, Pill, CheckCircle2, Circle, Plus,
  CalendarDays, ClipboardList, FileText, Eye, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getTodayMedications, markMedicationTaken, getPrescriptions } from "@/services/patientPortalService";
import { showError, showWarning } from "@/lib/alerts";
import { downloadTextFile } from "@/lib/downloadFile";

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" }) : "—";

const parseDurationDays = (duration) => {
  const match = String(duration || "").match(/\d+/);
  return match ? Number(match[0]) : 7;
};

// Un medicamento sigue "en curso" si hoy cae dentro de [emitido, emitido + duración].
// No hay forma de saber si el paciente completó todas las dosis, así que una vez pasado
// ese periodo simplemente se marca como "finalizado" (no "completado" ni "vencido",
// porque no tenemos ese dato real).
const calcularEstado = (issuedAt, duration) => {
  if (!issuedAt) return "curso";
  const dias = parseDurationDays(duration);
  const inicio = new Date(issuedAt);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + dias);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy < fin ? "curso" : "finalizado";
};

const ESTADO_LABEL = { curso: "En curso", finalizado: "Finalizado" };
const ESTADO_COLOR = { curso: "bg-amber-100 text-amber-700", finalizado: "bg-slate-100 text-slate-500" };

// Colores que van rotando por fila para que la lista no se vea toda igual
const COLORES = [
  { bg: "bg-blue-50", text: "text-blue-500" },
  { bg: "bg-emerald-50", text: "text-emerald-500" },
  { bg: "bg-purple-50", text: "text-purple-500" },
  { bg: "bg-amber-50", text: "text-amber-500" },
];

const buildRecetaTexto = (receta) => {
  const lineas = [
    "CLÍNICA FAMILIAR MONTE TABOR",
    "Receta médica",
    `Fecha: ${fmtFecha(receta.issued_at)}`,
    receta.doctor ? `Doctor: Dr. ${receta.doctor.name} ${receta.doctor.last_name}` : "",
    "",
    "Medicamentos:",
    ...(receta.medications || []).map((m) => `- ${m.name} ${m.dose} — ${m.frequency}, ${m.duration}`),
  ];
  return lineas.filter(Boolean).join("\n");
};

// Medicamentos activos hoy (con marcar tomado/pendiente) e historial de recetas anteriores
const Medications = () => {
  const navigate = useNavigate();
  const { patient, logout } = useAuth();

  const [hoy, setHoy] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cargar = () => {
    // allSettled: si el historial falla pero "hoy" carga bien (o viceversa), igual se muestra lo que sí llegó
    Promise.allSettled([getTodayMedications(), getPrescriptions()]).then(([meds, recetas]) => {
      if (meds.status === "fulfilled") setHoy(meds.value);
      if (recetas.status === "fulfilled") setHistorial(recetas.value);

      if (meds.status === "rejected" || recetas.status === "rejected") {
        showError("No se pudo cargar toda la información de tus medicamentos.");
      }

      setLoading(false);
    });
  };

  useEffect(() => {
    cargar();
  }, []);

  const toggleTomado = async (medicationId, tomadoActual) => {
    setMarcando(medicationId);
    try {
      await markMedicationTaken(medicationId, !tomadoActual);
      setHoy((prev) => prev.map((m) => (m.medication_id === medicationId ? { ...m, taken: !tomadoActual } : m)));
    } catch (err) {
      showError(err.message || "No se pudo actualizar el medicamento.");
    } finally {
      setMarcando(null);
    }
  };

  // No existe (todavía) una forma de que el paciente agregue sus propios medicamentos;
  // los reales vienen siempre de una receta del doctor
  const handleAgregar = () => {
    showWarning("Los medicamentos los agrega tu doctor durante la consulta. Pronto podrás llevar tu propio registro aquí.");
  };

  const handleVerReceta = (receta) => {
    downloadTextFile(`receta-${fmtFecha(receta.issued_at)}.txt`, buildRecetaTexto(receta));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Aplana las recetas en una fila por medicamento, con su estado ya calculado
  const filasHistorial = useMemo(() => {
    const filas = [];
    historial.forEach((receta) => {
      (receta.medications || []).forEach((m) => {
        filas.push({ id: `${receta._id}-${m._id}`, receta, medicamento: m, estado: calcularEstado(receta.issued_at, m.duration) });
      });
    });
    return filas.sort((a, b) => new Date(b.receta.issued_at) - new Date(a.receta.issued_at));
  }, [historial]);

  const filtradas = filtroEstado === "todos" ? filasHistorial : filasHistorial.filter((f) => f.estado === filtroEstado);
  const visibles = mostrarTodo ? filtradas : filtradas.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="font-bold text-gray-800">Medicamentos</span>

          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-semibold text-sm flex-shrink-0">
                {patient?.name?.[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{patient?.name} {patient?.last_name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                <Pill className="w-6 h-6 text-[#3B6FCA]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis medicamentos</h1>
                <p className="text-gray-500 text-sm">Consulta tus medicamentos activos e historial de recetas.</p>
              </div>
            </div>

            {/* ── Medicamentos de hoy ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-[#3B6FCA]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Medicamentos de hoy</h2>
                    <p className="text-sm text-gray-500">Estos son los medicamentos que tienes programados para hoy.</p>
                  </div>
                </div>
                <button
                  onClick={handleAgregar}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B6FCA]/10 hover:bg-[#3B6FCA]/20 text-[#3B6FCA] text-sm font-semibold transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Agregar medicamento
                </button>
              </div>

              {hoy.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4">
                    <ClipboardList className="w-6 h-6 text-[#3B6FCA]/50" />
                  </div>
                  <p className="font-semibold text-gray-800">No tienes medicamentos programados para hoy</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-sm">Cuando tu médico te recete medicamentos, aparecerán aquí.</p>
                  <Link
                    to="/mis-citas"
                    className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors"
                  >
                    <CalendarDays className="w-4 h-4" /> Ver mis citas
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {hoy.map((m) => (
                    <div key={m.medication_id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{m.name} {m.dose}</p>
                          <p className="text-sm text-gray-400 truncate">{m.frequency}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTomado(m.medication_id, m.taken)}
                        disabled={marcando === m.medication_id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors disabled:opacity-50 ${
                          m.taken ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {m.taken ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                        {m.taken ? "Tomado" : "Pendiente"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Historial ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#3B6FCA]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Historial de medicamentos</h2>
                    <p className="text-sm text-gray-500">Consulta tus recetas y medicamentos anteriores.</p>
                  </div>
                </div>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B6FCA] bg-white flex-shrink-0"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="curso">En curso</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>

              {filasHistorial.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Todavía no tienes recetas registradas.</p>
              ) : visibles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No hay medicamentos con ese estado.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-2 pb-3 font-semibold">Medicamento</th>
                        <th className="px-2 pb-3 font-semibold">Recetado por</th>
                        <th className="px-2 pb-3 font-semibold">Fecha</th>
                        <th className="px-2 pb-3 font-semibold">Estado</th>
                        <th className="px-2 pb-3 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((fila, i) => {
                        const color = COLORES[i % COLORES.length];
                        return (
                          <tr key={fila.id} className="border-t border-gray-50">
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                  <Pill className={`w-4 h-4 ${color.text}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-800 truncate">{fila.medicamento.name} {fila.medicamento.dose}</p>
                                  <p className="text-xs text-gray-400 truncate">{fila.medicamento.frequency}</p>
                                  {fila.medicamento.route_of_administration && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">
                                      {fila.medicamento.route_of_administration}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-gray-600">
                              {fila.receta.doctor ? `Dr(a). ${fila.receta.doctor.name} ${fila.receta.doctor.last_name}` : "—"}
                            </td>
                            <td className="px-2 py-3 text-gray-600 whitespace-nowrap">
                              <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-gray-300" /> {fmtFecha(fila.receta.issued_at)}</span>
                            </td>
                            <td className="px-2 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[fila.estado]}`}>
                                {ESTADO_LABEL[fila.estado]}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-right">
                              <button
                                onClick={() => handleVerReceta(fila.receta)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#3B6FCA] text-gray-600 hover:text-[#3B6FCA] text-xs font-semibold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver receta
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!mostrarTodo && filtradas.length > 5 && (
                <button
                  onClick={() => setMostrarTodo(true)}
                  className="flex items-center gap-1.5 mx-auto mt-4 text-sm font-semibold text-[#3B6FCA] hover:underline"
                >
                  Ver más historial <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <ShieldCheck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Información importante</p>
                <p className="text-sm text-gray-500 mt-0.5">Consulta siempre con tu médico antes de suspender o modificar cualquier medicamento.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Medications;