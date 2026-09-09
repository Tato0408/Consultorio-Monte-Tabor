import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";
import { Plus, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, SectionCard } from "../global/ui";
import VitalSignsFormModal from "../global/VitalSignsFormModal";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { useAuth } from "@/context/AuthContext";
import { formatFecha } from "../../hooks/useRecords";
import ClinicalHistoryDocument from "@/modules/schedule/consultations/pdf/ClinicalHistoryDocument";
import { downloadPdf } from "@/modules/schedule/consultations/pdf/downloadPdf";
import { pdfDateTime } from "@/modules/schedule/consultations/pdf/pdfDate";

// Sentinela que useRecords deja en noPatologicos cuando el campo está vacío.
// En el PDF ese texto no aplica, se quiere un guión.
const NON_PATHOLOGICAL_PLACEHOLDER = "Sin antecedentes no patológicos registrados.";

// La tabla de historial pagina a partir de 20 tomas: hasta 20 se muestran
// todas sin controles, de la 21 en adelante aparece la paginación.
const TABLE_PAGE_SIZE = 20;

// Configuración de cada tarjeta clicable: a qué campo o campos de
// signosVitalesHistorial corresponde y cómo graficarlo.
const METRICS = {
  presionArterial: { label: "Presión arterial", unit: "mmHg", color: "#3b82f6", type: "bp" },
  glucosa: { label: "Glucosa", unit: "mg/dL", color: "#ef4444", type: "single", field: "glucosa" },
  peso: { label: "Peso", unit: "kg", color: "#10b981", type: "single", field: "peso" },
  temperatura: { label: "Temperatura", unit: "°C", color: "#f97316", type: "single", field: "temp" },
  imc: { label: "IMC", unit: "kg/m²", color: "#eab308", type: "single", field: "imc" },
};

const toNumber = (raw) => (typeof raw === "number" && Number.isFinite(raw) ? raw : null);

// Arma los puntos del gráfico para la métrica seleccionada, en orden
// cronológico ascendente (signosVitalesHistorial viene más reciente primero).
const buildChartData = (historial, metricKey) => {
  const config = METRICS[metricKey];
  return [...historial].reverse().map((h, i) => {
    const point = { cita: `Cita ${i + 1}` };
    if (config.type === "bp") {
      const [sistolica, diastolica] =
        typeof h.presion === "string" && h.presion.includes("/")
          ? h.presion.split("/").map((n) => Number(n.trim()))
          : [null, null];
      point.sistolica = Number.isFinite(sistolica) ? sistolica : null;
      point.diastolica = Number.isFinite(diastolica) ? diastolica : null;
    } else {
      point.value = toNumber(h[config.field]);
    }
    return point;
  });
};

// Espera patient.signosVitales (última toma) y
// patient.signosVitalesHistorial (para el gráfico y la tabla).
const HistorialSignosVitales = ({ patient = {}, onSaved }) => {
  const v = patient.signosVitales ?? {};
  // Agregar, editar y eliminar tomas depende del modulo "Expediente"
  // (reports.records) en Roles y Permisos.
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("reports.records", "create");
  const canUpdate = hasPermission("reports.records", "update");
  const canDelete = hasPermission("reports.records", "delete");
  const showRowActions = canUpdate || canDelete;
  const [selectedMetric, setSelectedMetric] = useState("imc");
  const [modalOpen, setModalOpen] = useState(false);
  // Cuando editEntry es null, el modal de agregar o editar está en modo
  // agregar. Con una fila, edita esa toma puntual.
  const [editEntry, setEditEntry] = useState(null);
  const historial = useMemo(() => patient.signosVitalesHistorial ?? [], [patient.signosVitalesHistorial]);

  // Paginación de la tabla de historial (fija a 20 filas por página).
  const [tablePage, setTablePage] = useState(1);
  const tableTotalPages = Math.max(1, Math.ceil(historial.length / TABLE_PAGE_SIZE));
  const currentTablePage = Math.min(tablePage, tableTotalPages);
  // Al agregar o eliminar tomas la última página puede desaparecer, se
  // recoloca en la última existente.
  useEffect(() => {
    if (tablePage > tableTotalPages) setTablePage(tableTotalPages);
  }, [tablePage, tableTotalPages]);
  const tableRows = historial.slice(
    (currentTablePage - 1) * TABLE_PAGE_SIZE,
    currentTablePage * TABLE_PAGE_SIZE
  );

  const metrics = [
    { key: "presionArterial", label: "Presión arterial", value: v.presionArterial, unit: "mmHg" },
    { key: "glucosa", label: "Glucosa", value: v.glucosa, unit: "mg/dL" },
    { key: "peso", label: "Peso", value: v.peso, unit: "" },
    { key: "temperatura", label: "Temperatura", value: v.temperatura, unit: "°C" },
    { key: "imc", label: "IMC", value: v.imc, unit: v.imcCategoria || "kg/m²" },
  ];

  const config = METRICS[selectedMetric];
  const chartData = useMemo(
    () => buildChartData(historial, selectedMetric),
    [historial, selectedMetric]
  );
  const isImc = selectedMetric === "imc";
  // La temperatura corporal se mueve en una banda estrecha (fiebre desde ~38,
  // riesgo alto sobre 40), así que el eje se fija a un rango clínico legible
  // en vez de dejar que se autoescale con una o dos tomas.
  const isTemperatura = selectedMetric === "temperatura";

  const openAddModal = () => {
    setEditEntry(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditEntry(row);
    setModalOpen(true);
  };

  // Al guardar (agregar o editar) se refresca todo el expediente mediante
  // onSaved (ver refreshAll en RecordDetailPage.jsx). Como el gráfico y las
  // tarjetas de arriba se derivan del mismo historial que llena esta tabla,
  // quedan al día automáticamente sin lógica aparte.
  // Arma el PDF de historial clínico con los datos ya mapeados del expediente
  // (mismo documento que puede descargar el paciente desde su portal). Los
  // antecedentes que no estén registrados van como guión dentro del documento.
  const handleDownloadHistory = async () => {
    const h = patient.historiaClinica || {};
    const nonPathological =
      h.noPatologicos && h.noPatologicos !== NON_PATHOLOGICAL_PLACEHOLDER ? h.noPatologicos : "";
    const patientFullName = `${patient.nombre || ""} ${patient.apellido || ""}`.trim();
    const { date, time, fileSafe } = pdfDateTime();
    try {
      await downloadPdf(
        <ClinicalHistoryDocument
          title={`Historial clínico de ${patientFullName} ${fileSafe}`}
          patientName={patientFullName}
          age={patient.edad}
          gender={patient.sexo}
          dui={patient.dui}
          bloodType={patient.tipoSangre}
          birthDate={formatFecha(patient.birthDate)}
          date={date}
          time={time}
          vitals={historial.map((r) => ({
            fecha: r.fecha,
            presion: r.presion,
            glucosa: r.glucosa,
            peso: r.peso,
            altura: r.altura,
            temp: r.temp,
            spo2: r.spo2 !== "—" ? `${r.spo2}%` : "—",
          }))}
          hereditary={(h.hereditarios || []).map((item) => ({
            parentesco: item.a,
            condicion: item.b,
            tipo: item.tipo,
          }))}
          pathological={(h.patologicos || []).map((item) => ({
            enfermedad: item.a,
            diagnostico: item.b,
            tipo: item.tipo,
          }))}
          nonPathological={nonPathological}
          ecologicalSocial={h.ecologicoSociales}
          procedures={(patient.procedimientos || [])
            .filter((p) => p.consultationId)
            .map((p) => ({ nombre: p.nombre, fecha: p.fecha }))}
        />,
        `Historial clínico - ${patientFullName} ${fileSafe}`
      );
    } catch (err) {
      showError(err.message || "No se pudo generar el historial clínico");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar esta toma de signos vitales?",
      text: `Se borrará el registro del ${row.fecha}. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    try {
      await apiClient(`/patients/${patient.id}/vital-signs/${row.id}`, { method: "DELETE" });
      showSuccess("Registro eliminado correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el registro");
    }
  };

  return (
    <div className="space-y-5">

      {/* Encabezado: descargar el historial clínico solo aparece cuando ya hay
          al menos una toma de signos vitales (ver regla en el PDF). Agregar
          sigue dependiendo del permiso de crear en el expediente. */}
      {(historial.length > 0 || canCreate) && (
        <div className="flex justify-end gap-2">
          {historial.length > 0 && (
            <button
              onClick={handleDownloadHistory}
              className="flex items-center gap-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Download size={16} /> Descargar historial clínico
            </button>
          )}
          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm"
            >
              Agregar <Plus size={16} />
            </button>
          )}
        </div>
      )}

      {/* Tarjetas de métricas: clic para actualizar el gráfico de abajo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((m) => {
          const active = selectedMetric === m.key;
          return (
            <button
              type="button"
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={
                "rounded-xl border p-4 text-center shadow-sm transition-colors " +
                (active
                  ? "bg-blue-600 border-blue-600"
                  : "bg-blue-50 border-blue-100 hover:border-blue-300")
              }
            >
              <p className={"text-xs font-medium " + (active ? "text-blue-100" : "text-slate-500")}>
                {m.label}
              </p>
              <p className={"text-2xl font-bold mt-1 " + (active ? "text-white" : "text-slate-800")}>
                {m.value ?? "—"}
              </p>
              <p className={"text-xs mt-0.5 " + (active ? "text-blue-100" : "text-slate-400")}>
                {m.unit}
              </p>
            </button>
          );
        })}
      </div>

      {/* Gráfico de la métrica seleccionada */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 rounded" style={{ background: config.color }} />
            {config.label}
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metricFillSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="cita" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              domain={isImc ? [20, 40] : isTemperatura ? [35, 41] : ["auto", "auto"]}
              ticks={isImc ? [20, 25, 30, 35, 40] : isTemperatura ? [35, 36, 37, 38, 39, 40, 41] : undefined}
              tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            {config.type === "bp" ? (
              <>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone" dataKey="sistolica" name="Sistólica"
                  stroke="#ef4444" strokeWidth={2}
                  fill="url(#metricFill)"
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Area
                  type="monotone" dataKey="diastolica" name="Diastólica"
                  stroke="#3b82f6" strokeWidth={2}
                  fill="url(#metricFillSecondary)"
                  dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </>
            ) : (
              <Area
                type="monotone" dataKey="value" name={config.label}
                stroke={config.color} strokeWidth={2}
                fill="url(#metricFill)"
                dot={{ r: 3, fill: config.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              >
                <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
              </Area>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tabla de historial */}
      <Card>
        {/* table-fixed reparte las 9 columnas en anchos iguales; encabezado con la misma
            franja gris (bg-slate-50, mayúsculas) que las tablas de los reportes y todo
            centrado. min-w mantiene la tabla legible y deja el scroll horizontal. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm table-fixed">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="py-2.5 px-2 font-semibold text-center">Fecha</th>
              <th className="py-2.5 px-2 font-semibold text-center">Presión (mmHg)</th>
              <th className="py-2.5 px-2 font-semibold text-center">Glucosa (mg/dL)</th>
              <th className="py-2.5 px-2 font-semibold text-center">Peso (kg)</th>
              <th className="py-2.5 px-2 font-semibold text-center">Altura (m)</th>
              <th className="py-2.5 px-2 font-semibold text-center">IMC</th>
              <th className="py-2.5 px-2 font-semibold text-center">Temperatura (c°)</th>
              <th className="py-2.5 px-2 font-semibold text-center">SPO2%</th>
              {showRowActions && <th className="py-2.5 px-2 font-semibold text-center">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 text-slate-600">
                <td className="py-3 px-2 text-center whitespace-nowrap">{r.fecha}</td>
                <td className="py-3 px-2 text-center">{r.presion}</td>
                <td className="py-3 px-2 text-center">{r.glucosa}</td>
                <td className="py-3 px-2 text-center">{r.peso}</td>
                <td className="py-3 px-2 text-center">{r.altura}</td>
                <td className="py-3 px-2 text-center">{r.imc}</td>
                <td className="py-3 px-2 text-center">{r.temp}</td>
                <td className="py-3 px-2 text-center">{r.spo2 !== "—" ? `${r.spo2}%` : "—"}</td>
                {showRowActions && (
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {historial.length === 0 && (
              <tr>
                <td colSpan={showRowActions ? 9 : 8} className="py-6 text-center text-slate-400">
                  Sin tomas de signos vitales registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Paginación: solo aparece a partir de la fila 21. */}
        {historial.length > TABLE_PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-1 text-sm text-slate-500">
            <span>
              {(currentTablePage - 1) * TABLE_PAGE_SIZE + 1}
              {" a "}
              {Math.min(currentTablePage * TABLE_PAGE_SIZE, historial.length)}
              {" de "}
              {historial.length} tomas
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setTablePage(currentTablePage - 1)}
                disabled={currentTablePage === 1}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-slate-600">
                <span className="font-medium text-slate-800">{currentTablePage}</span> de {tableTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setTablePage(currentTablePage + 1)}
                disabled={currentTablePage === tableTotalPages}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <VitalSignsFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        patientId={patient.id}
        editEntry={editEntry}
        onSaved={onSaved}
      />
    </div>
  );
};

export default HistorialSignosVitales;
