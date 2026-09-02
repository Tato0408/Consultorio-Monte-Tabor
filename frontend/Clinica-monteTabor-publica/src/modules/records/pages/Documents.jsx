import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  IdCard,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPrescriptions, getSickLeaves, getReferrals } from "@/services/patientPortalService";
import { showError } from "@/lib/alerts";
import { downloadTextFile } from "@/lib/downloadFile";
import { descargarIncapacidadPdf, descargarRecetaPdf } from "@/lib/pdf/patientDocuments";

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—";

// Config por tipo. Mismos dos colores que la app móvil (incapacidad = azul de marca,
// receta = verde); referencia lleva violeta porque solo existe en la web.
const TIPOS = {
  incapacidad: {
    label: "Incapacidades",
    subtitle: "Constancias de incapacidad médica",
    icon: IdCard,
    accent: "#3B6FCA",
    iconBg: "bg-[#EEF3FF]",
    dateField: "start_date",
    bodyLabel: "Diagnóstico",
  },
  receta: {
    label: "Recetas",
    subtitle: "Recetas médicas emitidas",
    icon: FileText,
    accent: "#16A34A",
    iconBg: "bg-[#EAF8F0]",
    dateField: "issued_at",
    bodyLabel: "Medicamentos",
  },
  referencia: {
    label: "Referencias",
    subtitle: "Referencias a otros especialistas",
    icon: ArrowLeftRight,
    accent: "#7C4FD1",
    iconBg: "bg-[#F1EBFB]",
    dateField: "date",
    bodyLabel: "Motivo",
  },
};
const ORDEN = ["incapacidad", "receta", "referencia"];

// Misma regla que usePatientRecordDetail.js (expediente clínico, web privada): vigente
// mientras la fecha de finalización no haya pasado, o no exista.
const isSickLeaveVigente = (endDate) => {
  if (!endDate) return true;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
};

const nombreDoctor = (doctor) =>
  doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim() : "Doctor no especificado";

// El backend guarda estas fechas como medianoche UTC del día real: hay que leerlas con
// los getters UTC para que el día no se corra al comparar contra el filtro.
const isoDiaUTC = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const buildTextoReferencia = (r) =>
  [
    "CLÍNICA FAMILIAR MONTE TABOR",
    "Referencia médica",
    `Fecha: ${fmtFecha(r.date)}`,
    r.doctor ? `Doctor: ${nombreDoctor(r.doctor)}` : "",
    "",
    `Motivo: ${r.reason || "—"}`,
    `Referido a: ${r.referred_to || "—"}`,
    `Estado: ${r.status || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");

const bodyValue = (tipo, doc) => {
  if (tipo === "incapacidad") return doc.diagnosis || "Sin diagnóstico registrado";
  if (tipo === "receta")
    return (
      (doc.medications || [])
        .map((m) => m.name)
        .filter(Boolean)
        .join(", ") || "Sin medicamentos registrados"
    );
  return doc.reason || "Sin motivo registrado";
};

// Tarjeta de un documento. Las clases base son las de la vista móvil; los prefijos lg:
// solo suben el tamaño en escritorio, así el móvil queda idéntico.
const DocCard = ({ tipo, doc, descargando, onDownload }) => {
  const cfg = TIPOS[tipo];
  const vigente = tipo === "incapacidad" && isSickLeaveVigente(doc.end_date);
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-gray-900 lg:text-[15px]">{fmtFecha(doc[cfg.dateField])}</p>
            {tipo === "incapacidad" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  vigente ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {vigente ? "Vigente" : "No vigente"}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11.5px] text-gray-400 lg:text-[13px]">
            {nombreDoctor(doc.doctor || doc.doctor_id)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDownload(doc, tipo)}
          disabled={descargando}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#EEF3FF] px-3 py-1.5 text-[11px] font-bold text-[#3B6FCA] hover:bg-[#e2ebfd] disabled:opacity-60 lg:px-4 lg:py-2 lg:text-[12px]"
        >
          {descargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Descargar
        </button>
      </div>
      <div className="mt-3 border-t border-gray-50 pt-3 lg:mt-4 lg:pt-4">
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-gray-400">{cfg.bodyLabel}</p>
        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-gray-700 lg:text-[13.5px]">
          {bodyValue(tipo, doc)}
        </p>
      </div>
    </div>
  );
};

const EmptyState = ({ tipo, sinNinguno }) => {
  const cfg = TIPOS[tipo];
  const Icon = cfg.icon;
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.6} />
      <p className="mt-3 text-sm font-semibold text-gray-800">
        {sinNinguno ? `Todavía no tienes ${cfg.label.toLowerCase()}` : "Sin documentos en esa fecha"}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {sinNinguno
          ? "Aparecerán aquí cuando tu doctor los genere en una consulta."
          : "Prueba quitando el filtro o eligiendo otra fecha."}
      </p>
    </div>
  );
};

// Portada tipo app móvil en pantallas chicas (portada → listado); en escritorio, riel de
// categorías fijo a la izquierda + el listado del tipo activo a la derecha. Mismo
// funcionamiento y mismos datos en ambos.
const Documents = () => {
  const { patient } = useAuth();
  const [data, setData] = useState({ incapacidad: [], receta: [], referencia: [] });
  const [loading, setLoading] = useState(true);
  // null = portada (solo relevante en móvil); un tipo = categoría elegida.
  const [tipo, setTipo] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [descargandoId, setDescargandoId] = useState(null);

  useEffect(() => {
    // allSettled: si una categoría falla, las otras se muestran igual.
    Promise.allSettled([getPrescriptions(), getSickLeaves(), getReferrals()]).then(([p, s, r]) => {
      setData({
        receta: p.status === "fulfilled" ? p.value : [],
        incapacidad: s.status === "fulfilled" ? s.value : [],
        referencia: r.status === "fulfilled" ? r.value : [],
      });
      if (p.status === "rejected" || s.status === "rejected" || r.status === "rejected") {
        showError("Algunos documentos no se pudieron cargar.");
      }
      setLoading(false);
    });
  }, []);

  const counts = {
    incapacidad: data.incapacidad.length,
    receta: data.receta.length,
    referencia: data.referencia.length,
  };
  const total = counts.incapacidad + counts.receta + counts.referencia;

  // En escritorio siempre se muestra un listado, así que si aún no se eligió nada se cae
  // a la primera categoría.
  const tipoLista = tipo || ORDEN[0];
  const cfg = TIPOS[tipoLista];

  const listaVisible = useMemo(() => {
    return [...data[tipoLista]]
      .filter((d) => !filtroFecha || isoDiaUTC(d[TIPOS[tipoLista].dateField]) === filtroFecha)
      .sort((a, b) => new Date(b[TIPOS[tipoLista].dateField]) - new Date(a[TIPOS[tipoLista].dateField]));
  }, [tipoLista, data, filtroFecha]);

  const abrir = (t) => {
    setTipo(t);
    setFiltroFecha("");
  };
  const volverAlHub = () => {
    setTipo(null);
    setFiltroFecha("");
  };

  const descargar = async (doc, t) => {
    setDescargandoId(doc._id);
    try {
      if (t === "receta") await descargarRecetaPdf(patient, doc);
      else if (t === "incapacidad") await descargarIncapacidadPdf(patient, doc);
      else downloadTextFile(`referencia-${fmtFecha(doc.date)}.txt`, buildTextoReferencia(doc));
    } catch (err) {
      showError(err.message || "No se pudo generar el documento.");
    } finally {
      setDescargandoId(null);
    }
  };

  const cargando = (
    <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin text-[#3B6FCA]" /> Cargando...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Barra superior — se adapta al ancho */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between lg:hidden">
          {tipo ? (
            <button
              type="button"
              onClick={volverAlHub}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-4 w-4" /> Volver
            </Link>
          )}
          <span className="text-sm font-semibold text-gray-800">
            {tipo ? TIPOS[tipo].label : "Mis documentos"}
          </span>
          <div className="w-16" />
        </div>
        <div className="mx-auto hidden max-w-6xl lg:block">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-4 w-4" /> Volver al panel
          </Link>
        </div>
      </header>

      {/* ──────────────── Móvil / tablet: portada → listado ──────────────── */}
      <div className="lg:hidden">
        {tipo === null ? (
          <div className="mx-auto max-w-2xl px-6 py-8">
            <div
              className="relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[0_18px_40px_-18px_rgba(59,111,202,0.55)] sm:px-8"
              style={{ background: "linear-gradient(135deg,#3B6FCA 0%,#3183C0 55%,#17A2B8 100%)" }}
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">Perfil · Documentos</p>
              <h1 className="mt-1.5 text-xl font-bold sm:text-2xl">Tus documentos médicos</h1>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/90">
                {loading
                  ? "Cargando tus documentos…"
                  : total > 0
                  ? `${total} ${total === 1 ? "documento generado" : "documentos generados"} en tus consultas. Elige una categoría para verlos.`
                  : "Aquí verás tus recetas, incapacidades y referencias cuando tu doctor las genere."}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {ORDEN.map((t) => {
                const c = TIPOS[t];
                const Icon = c.icon;
                const n = counts[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => abrir(t)}
                    className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-gray-200 hover:shadow-md sm:flex-col sm:items-start sm:gap-0 sm:p-5"
                  >
                    <span
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${c.iconBg} sm:mb-3`}
                    >
                      <Icon className="h-[22px] w-[22px]" style={{ color: c.accent }} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1 sm:flex-none">
                      <span className="block text-[15px] font-bold text-gray-900">{c.label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {loading ? "—" : `${n} ${n === 1 ? "documento" : "documentos"}`}
                      </span>
                    </span>
                    <ChevronRight className="h-[18px] w-[18px] flex-shrink-0 text-gray-300 transition group-hover:translate-x-0.5 sm:hidden" />
                    <span
                      className="mt-3 hidden items-center gap-1 text-[12.5px] font-semibold sm:inline-flex"
                      style={{ color: c.accent }}
                    >
                      Ver todas <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-8">
            <div className="mb-6 flex items-center gap-2.5">
              <div className="relative w-full max-w-xs">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:border-[#3B6FCA] focus:outline-none"
                />
              </div>
              {filtroFecha && (
                <button
                  type="button"
                  onClick={() => setFiltroFecha("")}
                  className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600"
                  aria-label="Quitar filtro"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {loading ? (
              cargando
            ) : listaVisible.length === 0 ? (
              <EmptyState tipo={tipoLista} sinNinguno={data[tipoLista].length === 0} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {listaVisible.map((doc) => (
                  <DocCard
                    key={doc._id}
                    tipo={tipoLista}
                    doc={doc}
                    descargando={descargandoId === doc._id}
                    onDownload={descargar}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────── Escritorio: riel de categorías + contenido ──────────────── */}
      <div className="mx-auto hidden max-w-6xl px-6 py-8 lg:block">
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-6 text-white shadow-[0_18px_36px_-20px_rgba(59,111,202,0.5)]"
          style={{ background: "linear-gradient(135deg,#3B6FCA 0%,#3183C0 55%,#17A2B8 100%)" }}
        >
          <div className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">Perfil · Documentos</p>
          <h1 className="mt-1.5 text-xl font-bold">Mis documentos médicos</h1>
          <p className="mt-1.5 text-[13.5px] text-white/90">
            {loading
              ? "Cargando tus documentos…"
              : total > 0
              ? `${total} ${total === 1 ? "documento" : "documentos"} de todas tus consultas.`
              : "Aquí verás tus recetas, incapacidades y referencias cuando tu doctor las genere."}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-[280px_minmax(0,1fr)] items-start gap-7">
          {/* Riel */}
          <aside className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Categorías</p>
            <div className="flex flex-col gap-0.5">
              {ORDEN.map((t) => {
                const c = TIPOS[t];
                const Icon = c.icon;
                const activo = t === tipoLista;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => abrir(t)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      activo ? "bg-[#EEF3FF]" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color: c.accent }} strokeWidth={1.9} />
                    </span>
                    <span
                      className={`flex-1 text-sm ${activo ? "font-bold" : "font-semibold text-gray-700"}`}
                      style={activo ? { color: c.accent } : undefined}
                    >
                      {c.label}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: activo ? c.accent : "#9ca3af" }}
                    >
                      {loading ? "—" : counts[t]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="my-3 h-px bg-gray-100" />

            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Filtrar</p>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-2 text-[13px] text-gray-700 focus:border-[#3B6FCA] focus:outline-none"
              />
            </div>
            {filtroFecha && (
              <button
                type="button"
                onClick={() => setFiltroFecha("")}
                className="mt-1.5 px-2 text-xs font-medium text-[#3B6FCA] hover:underline"
              >
                Quitar filtro
              </button>
            )}
          </aside>

          {/* Contenido */}
          <div>
            <div className="mb-4 flex items-baseline gap-2.5">
              <h2 className="text-lg font-bold text-gray-900">{cfg.label}</h2>
              <span className="text-sm text-gray-400">
                {loading ? "—" : `${counts[tipoLista]} ${counts[tipoLista] === 1 ? "documento" : "documentos"}`}
              </span>
            </div>

            {loading ? (
              cargando
            ) : listaVisible.length === 0 ? (
              <EmptyState tipo={tipoLista} sinNinguno={data[tipoLista].length === 0} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {listaVisible.map((doc) => (
                  <DocCard
                    key={doc._id}
                    tipo={tipoLista}
                    doc={doc}
                    descargando={descargandoId === doc._id}
                    onDownload={descargar}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
