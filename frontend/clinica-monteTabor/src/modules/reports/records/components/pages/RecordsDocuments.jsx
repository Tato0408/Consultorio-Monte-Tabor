"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FileDown, ChevronLeft, ChevronRight, ChevronDown, IdCard, Pill, FlaskConical, ArrowLeftRight } from "lucide-react";
import { Badge } from "../global/ui";
import { useAuth } from "@/context/AuthContext";
import IncapacidadFormModal from "../global/IncapacidadFormModal";
import PrescriptionFormModal from "../global/PrescriptionFormModal";
import LabOrderFormModal from "../global/LabOrderFormModal";
import ReferralFormModal from "../global/ReferralFormModal";
import apiClient from "@/lib/apiClient";
import { confirmDelete, showSuccess, showError } from "@/lib/alerts";
import { calculateAge } from "@/lib/validators";
import { openPdfInNewTab } from "@/modules/schedule/consultations/pdf/openPdfInNewTab";
import { pdfDateTime } from "@/modules/schedule/consultations/pdf/pdfDate";
import IncapacidadDocument from "@/modules/schedule/consultations/pdf/IncapacidadDocument";
import RecetaDocument from "@/modules/schedule/consultations/pdf/RecetaDocument";
import LabOrderDocument from "@/modules/schedule/consultations/pdf/LabOrderDocument";
import ReferenciaDocument from "@/modules/schedule/consultations/pdf/ReferenciaDocument";
import { get_document_signature } from "@/lib/documentSignature";

// Configuración de cada tipo de documento: de dónde sale su lista dentro de
// patient (armada por usePatientRecordDetail.js), su icono/color y cómo
// mostrar cada fila (detalle + subtítulo + estado) sin tener que ramificar
// el render de la tabla por tipo.
const TIPOS = {
  incapacidad: {
    label: "Incapacidades",
    icon: IdCard,
    activeChip: "bg-blue-600 text-white",
    dataKey: "incapacidades",
    row: (r) => ({ detalle: r.nombre, sub: `Hasta ${r.fechaFin}`, estado: r.estado, tone: r.estado === "No vigente" ? "gray" : "green" }),
  },
  receta: {
    label: "Recetas",
    icon: Pill,
    activeChip: "bg-emerald-600 text-white",
    dataKey: "recetas",
    row: (r) => ({ detalle: r.nombre, sub: r.doctor, estado: "Emitida", tone: "gray" }),
  },
  laboratorio: {
    label: "Órdenes de laboratorio",
    icon: FlaskConical,
    activeChip: "bg-teal-600 text-white",
    dataKey: "laboratorios",
    row: (r) => ({ detalle: r.nombre, sub: r.doctorName, estado: r.estado, tone: "blue" }),
  },
  referencia: {
    label: "Referencias",
    icon: ArrowLeftRight,
    activeChip: "bg-violet-600 text-white",
    dataKey: "referencias",
    row: (r) => ({ detalle: r.nombre, sub: r.doctorName, estado: r.estado, tone: r.estado === "Completada" ? "green" : "blue" }),
  },
};
const ORDEN = ["incapacidad", "receta", "laboratorio", "referencia"];

// Pestaña "Documentos" del expediente: agrupa, en un mismo selector de
// categorías, los cuatro tipos de documento que puede generar una consulta
// (incapacidades, recetas, órdenes de laboratorio y referencias), con la
// misma mecánica de descargar/editar/eliminar para todos, siguiendo la
// interfaz de "Mis documentos" del sitio público (ver
// Clinica-monteTabor-publica/src/modules/records/pages/Documents.jsx).
// tipo/onTipoChange son opcionales y controlados desde RecordDetailPage,
// para que "Ver más" en el Resumen pueda abrir esta pestaña ya en la
// categoría elegida.
export default function DocumentosTab({ patient = {}, onSaved, tipo: tipoControlado, onTipoChange }) {
  const { hasPermission, user, userType } = useAuth();
  const canCreate = hasPermission("reports.records", "create");
  const canUpdate = hasPermission("reports.records", "update");
  const canDelete = hasPermission("reports.records", "delete");
  // Generar el PDF no depende de quién emitió el documento: cualquiera con
  // permiso de ver el expediente puede reimprimirlo (ej. un admin, si el
  // paciente perdió su copia).
  const canGeneratePdf = hasPermission("reports.records", "view");

  const [tipoInterno, setTipoInterno] = useState("incapacidad");
  const tipo = tipoControlado || tipoInterno;
  const setTipo = onTipoChange || setTipoInterno;

  const [incapacidadModalOpen, setIncapacidadModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [labOrderModalOpen, setLabOrderModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const cfg = TIPOS[tipo];
  const data = patient[cfg.dataKey] ?? [];
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  // Al cambiar de categoría se vuelve siempre a la primera página, si no la
  // paginación de la categoría anterior podría dejar una página vacía.
  useEffect(() => setPage(1), [tipo]);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const rows = data.slice(start, start + rowsPerPage);

  const patientFullName = `${patient.nombre || ""} ${patient.apellido || ""}`.trim();

  const openEdit = (row) => {
    setEditingEntry(row);
    if (tipo === "incapacidad") setIncapacidadModalOpen(true);
    else if (tipo === "receta") setPrescriptionModalOpen(true);
    else if (tipo === "laboratorio") setLabOrderModalOpen(true);
    else setReferralModalOpen(true);
  };

  const openCreate = () => {
    setEditingEntry(null);
    setIncapacidadModalOpen(true);
  };

  const DELETE_ENDPOINT = {
    incapacidad: (row) => `/sick-leaves/${row.id}`,
    receta: (row) => `/prescriptions/${row.id}`,
    laboratorio: (row) => `/lab-orders/${row.id}`,
    referencia: (row) => `/consultations/${row.consultationId}/referral`,
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete({
      title: `¿Eliminar este documento?`,
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      await apiClient(DELETE_ENDPOINT[tipo](row), { method: "DELETE" });
      showSuccess("Documento eliminado correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el documento");
    } finally {
      setDeletingId(null);
    }
  };

  // El PDF siempre sale a nombre del doctor asignado a la cita del
  // documento, sin importar quién lo descarga.
  const signatureFor = (originalDoctorName) => originalDoctorName;

  const handleGeneratePdf = async (row) => {
    try {
      // Firma y sello del doctor asignado: solo los recibe ese doctor o el
      // admin. Enfermería y recepción descargan el documento sin ellos.
      const { signatureUrl, sealUrl } = await get_document_signature(row.doctorId, { user, userType });
      // El documento se genera desde el expediente: la fecha y la hora son las
      // del momento en que se emitió (issued_at, start_date, referred_date),
      // no las de ahora.
      if (tipo === "incapacidad") {
        const { date: dateFormatted, time: timeFormatted, fileSafe } = pdfDateTime(row.startDateRaw);
        await openPdfInNewTab(
          <IncapacidadDocument
            title={`Incapacidad de ${patientFullName} ${fileSafe}`}
            patientName={patientFullName}
            dui={patient.dui}
            age={calculateAge(patient.birthDate)}
            diagnosis={row.diagnosisRaw}
            restDays={row.restDays}
            doctorName={signatureFor(row.doctorName)}
            signatureUrl={signatureUrl}
            sealUrl={sealUrl}
            date={dateFormatted}
            time={timeFormatted}
          />
        );
      } else if (tipo === "receta") {
        const { date: dateFormatted, time: timeFormatted, fileSafe } = pdfDateTime(row.issuedAtRaw);
        await openPdfInNewTab(
          <RecetaDocument
            title={`Receta médica de ${patientFullName} ${fileSafe}`}
            patientName={patientFullName}
            dui={patient.dui}
            age={calculateAge(patient.birthDate)}
            doctorName={signatureFor(row.doctorName)}
            signatureUrl={signatureUrl}
            sealUrl={sealUrl}
            date={dateFormatted}
            time={timeFormatted}
            medications={row.medicationsRaw}
            instructions={row.instructionsRaw}
          />
        );
      } else if (tipo === "laboratorio") {
        const o = row.labOrder;
        const dateSource = o.consultation_id?.date || o.issued_at || o.createdAt;
        const { date: dateFormatted, time: timeFormatted, fileSafe } = pdfDateTime(dateSource);
        await openPdfInNewTab(
          <LabOrderDocument
            title={`Orden de laboratorio de ${patientFullName} ${fileSafe}`}
            patientName={patientFullName}
            age={calculateAge(patient.birthDate)}
            gender={patient.sexo}
            dui={patient.dui}
            doctorName={signatureFor(row.doctorName)}
            signatureUrl={signatureUrl}
            sealUrl={sealUrl}
            date={dateFormatted}
            time={timeFormatted}
            weight={o.weight}
            height={o.height}
            pregnancy={o.pregnancy}
            antibioticTreatment={o.antibiotic_treatment}
            tests={o.tests || []}
            otherTests={o.other_tests}
          />
        );
      } else {
        const { date: dateFormatted, time: timeFormatted, fileSafe } = pdfDateTime(row.referredDateRaw);
        await openPdfInNewTab(
          <ReferenciaDocument
            title={`Referencia de ${patientFullName} ${fileSafe}`}
            patientName={patientFullName}
            dui={patient.dui}
            age={calculateAge(patient.birthDate)}
            patientPhone={patient.telefono}
            referredDoctorAddress={row.referredDoctorAddressRaw}
            referredDoctorPhone={row.referredDoctorPhoneRaw}
            reason={row.reasonRaw}
            referredTo={row.referredToRaw}
            bloodPressure={row.bloodPressureRaw}
            heartRate={row.heartRateRaw}
            respiratoryRate={row.respiratoryRateRaw}
            spo2={row.spo2Raw}
            physicalExam={row.physicalExamRaw}
            icdCode={row.icdRaw}
            diagnosis={row.diagnosisRaw}
            diagnosisDescription={row.diagnosisDescRaw}
            doctorName={signatureFor(row.doctorName)}
            signatureUrl={signatureUrl}
            sealUrl={sealUrl}
            date={dateFormatted}
            time={timeFormatted}
          />
        );
      }
    } catch (err) {
      showError(err?.message || "No se pudo generar el PDF del documento.");
    }
  };

  return (
    <div className="px-2 py-2 text-slate-800">
      {/* Selector de categorías, misma idea que el hub de "Mis documentos"
          del portal del paciente, pero como fila de chips (ya vive dentro
          de un sistema de pestañas, no necesita su propio riel). */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {ORDEN.map((t) => {
          const c = TIPOS[t];
          const Icon = c.icon;
          const activo = t === tipo;
          const count = (patient[c.dataKey] ?? []).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                activo ? c.activeChip : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {c.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activo ? "bg-white/20" : "bg-white text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {canCreate && tipo === "incapacidad" && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Agregar <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-4 gap-4 rounded-lg bg-slate-50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Detalle</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          <div className="mt-1">
            {rows.map((r) => {
              const { detalle, sub, estado, tone } = cfg.row(r);
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-4 items-center gap-4 border-t border-slate-50 px-2 py-5 text-center text-[15px] text-slate-700"
                >
                  <span>
                    <span className="block">{detalle}</span>
                    {sub && <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{sub}</span>}
                  </span>
                  <span className="text-slate-600">{r.fecha}</span>
                  <span className="flex justify-center">
                    <Badge tone={tone}>{estado}</Badge>
                  </span>
                  <span className="flex justify-center items-center gap-3">
                    {canGeneratePdf && (
                      <button
                        type="button"
                        onClick={() => handleGeneratePdf(r)}
                        title="Descargar documento"
                        className="text-slate-400 hover:text-blue-600"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        title="Editar documento"
                        className="text-slate-400 hover:text-amber-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        title="Eliminar documento"
                        className="text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {!canGeneratePdf && !canUpdate && !canDelete && <span className="text-slate-200">—</span>}
                  </span>
                </div>
              );
            })}

            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No hay {cfg.label.toLowerCase()} registradas.
              </p>
            )}
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>Filas por página</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-3 pr-7 text-slate-700 focus:outline-none"
              >
                {[8, 16, 24, 32].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-slate-600">
              <span className="font-medium text-slate-800">{page}</span> de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <IncapacidadFormModal
        isOpen={incapacidadModalOpen}
        onClose={() => setIncapacidadModalOpen(false)}
        patientId={patient.id}
        doctorId={editingEntry ? editingEntry.doctorId : user?.id}
        editEntry={editingEntry}
        onSaved={onSaved}
      />
      <PrescriptionFormModal
        isOpen={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
        entry={editingEntry}
        onSaved={onSaved}
      />
      <LabOrderFormModal
        isOpen={labOrderModalOpen}
        onClose={() => setLabOrderModalOpen(false)}
        entry={editingEntry}
        onSaved={onSaved}
      />
      <ReferralFormModal
        isOpen={referralModalOpen}
        onClose={() => setReferralModalOpen(false)}
        entry={editingEntry}
        onSaved={onSaved}
      />
    </div>
  );
}
