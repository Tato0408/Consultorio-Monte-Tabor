import { useState, useRef } from "react";
import {
  ArrowLeft,
  User,
  StickyNote,
  Pause,
  Play,
  ExternalLink,
  LogOut,
  RotateCcw,
  CalendarPlus,
  FileEdit,
  Paperclip,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
  Archive,
} from "lucide-react";
import StatusBadge from "../../reports/components/StatusBadge";
import { badge_color_by_tone } from "../data/treatmentsData";
import useTreatmentDetail from "../hooks/useTreatmentDetail";
import TreatmentTimeline from "./TreatmentTimeline";
import TreatmentTextModal from "./TreatmentTextModal";
import ScheduleControlModal from "./ScheduleControlModal";
import CloseTreatmentModal from "./CloseTreatmentModal";
import EditPlanModal from "./EditPlanModal";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-xs text-slate-400">{label}</span>
    <span className="text-xs font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

// Vista de detalle de un tratamiento: encabezado con acciones de
// transición, resumen del plan, línea de tiempo y documentos. Carga sus
// propios datos con useTreatmentDetail; las acciones vienen del hook de la
// lista (recibidas por props) y, al terminar, refrescan tanto este detalle
// como la lista.
const TreatmentDetail = ({
  treatmentId,
  canCreate,
  canUpdate,
  canDelete,
  onBack,
  onRefetchList,
  actions,
}) => {
  const { detail, loading, error, refresh } = useTreatmentDetail(treatmentId);
  const [openModal, setOpenModal] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Ejecuta una acción del hook de la lista y, al terminar bien, refresca
  // el detalle y la lista para que ambos queden al día.
  const run = async (promise, successMessage) => {
    try {
      await promise;
      if (successMessage) showSuccess(successMessage);
      await refresh();
      onRefetchList();
    } catch (err) {
      showError(err.message || "No se pudo completar la acción");
    }
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-400">Cargando tratamiento...</div>;
  }
  if (error || !detail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-red-500">
        {error || "No se encontró el tratamiento."}
      </div>
    );
  }

  const closeModal = () => {
    setOpenModal(null);
    setEditingEntry(null);
  };

  const handleDeleteNote = async (entry) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar esta nota?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;
    run(actions.delete_note(detail.id, entry.id), "Nota eliminada");
  };

  const handleDeleteTreatment = async () => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este tratamiento?",
      text: "Se eliminará el plan, la línea de tiempo y los documentos adjuntos. Todos los datos se perderán y la acción es irreversible.",
    });
    if (!confirmed) return;
    try {
      await actions.delete_treatment(detail.id);
      showSuccess("Tratamiento eliminado");
      onRefetchList();
      onBack();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el tratamiento");
    }
  };

  const handleDeleteDocument = async (doc) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este documento?",
      text: "El archivo se borrará permanentemente.",
    });
    if (!confirmed) return;
    run(actions.delete_document(detail.id, doc.id), "Documento eliminado");
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await actions.upload_document(detail.id, file);
      showSuccess("Documento subido");
      await refresh();
      onRefetchList();
    } catch (err) {
      showError(err.message || "No se pudo subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const is_active = detail.status === "activo";
  const is_paused = detail.status === "en_pausa";
  const is_closed = detail.status === "cerrado";

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a tratamientos
      </button>

      {/* Encabezado */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{detail.patient_name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{detail.patient_age_label}</p>
              <div className="mt-2">
                <StatusBadge label={detail.badge_label} color={badge_color_by_tone[detail.badge_tone] ?? "gray"} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(is_active || is_paused) && canCreate && (
              <button
                type="button"
                onClick={() => setOpenModal("note")}
                className="h-9 px-3.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 inline-flex items-center gap-1.5"
              >
                <StickyNote className="w-3.5 h-3.5" />
                Registrar nota
              </button>
            )}
            {is_active && canUpdate && (
              <button
                type="button"
                onClick={() => setOpenModal("pause")}
                className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </button>
            )}
            {is_paused && canUpdate && (
              <button
                type="button"
                onClick={() => run(actions.set_status(detail.id, { status: "activo" }), "Tratamiento reanudado")}
                className="h-9 px-3.5 rounded-lg border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-50 inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Reanudar
              </button>
            )}
            {is_active && canUpdate && (
              <button
                type="button"
                onClick={() => setOpenModal("derive")}
                className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Derivar
              </button>
            )}
            {(is_active || is_paused) && canUpdate && (
              <button
                type="button"
                onClick={() => setOpenModal("close")}
                className="h-9 px-3.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Finalizar tratamiento
              </button>
            )}
            {is_closed && canUpdate && (
              <button
                type="button"
                onClick={() => run(actions.set_status(detail.id, { status: "activo" }), "Tratamiento reabierto")}
                className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reabrir tratamiento
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteTreatment}
                className="h-9 px-3.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar tratamiento
              </button>
            )}
          </div>
        </div>

        {detail.alert && (
          <div className="mt-4 flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">
              <strong>Control vencido.</strong> El paciente no asistió a su control programado y no hay una nueva cita agendada. El tratamiento sigue activo.
            </p>
          </div>
        )}

        {is_paused && detail.pause_note && (
          <div className="mt-4 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <Pause className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed"><strong>Tratamiento en pausa.</strong> {detail.pause_note}</p>
          </div>
        )}

        {is_closed && (
          <div className="mt-4 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <Archive className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-700">{detail.badge_label} · {detail.closed_at}</p>
              {detail.closure_note && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{detail.closure_note}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* Resumen */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Resumen del plan</h4>
              {canUpdate && !is_closed && (
                <button
                  type="button"
                  onClick={() => setOpenModal("editPlan")}
                  className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <FileEdit className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>

            <div className="mb-3">
              <p className="text-[11px] text-slate-400">Objetivo</p>
              <p className="text-sm text-slate-800 font-medium leading-snug mt-0.5">{detail.objective}</p>
            </div>
            <div className="mb-3">
              <p className="text-[11px] text-slate-400">Plan</p>
              <p className="text-sm text-slate-700 leading-snug mt-0.5 whitespace-pre-wrap">{detail.plan_description}</p>
            </div>

            <div className="divide-y divide-slate-50 border-t border-slate-50 pt-1">
              <InfoRow label="Diagnóstico" value={detail.diagnosis} />
              <InfoRow label="Médico responsable" value={detail.doctor} />
              <InfoRow label="Inicio" value={detail.start_date} />
              <InfoRow label="Fin estimado" value={detail.estimated_end_date} />
            </div>

            <div className="mt-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-slate-400">Progreso</span>
                <span className="text-xs font-semibold text-slate-800">{detail.progress_label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${detail.progress_pct}%` }} />
              </div>
            </div>

            <div className="border-t border-slate-50 mt-3 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-slate-400">Próximo control</p>
                {canUpdate && !is_closed && (
                  <button
                    type="button"
                    onClick={() => setOpenModal("control")}
                    className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    Programar
                  </button>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800">{detail.next_control}</p>
            </div>

            <div className="border-t border-slate-50 mt-3 pt-3">
              <p className="text-[11px] text-slate-400 mb-1.5">Medicación vigente</p>
              {detail.current_medications.map((med, i) => (
                <p key={i} className="text-xs text-slate-700 py-0.5">{med}</p>
              ))}
            </div>

            {detail.opened_by_consultation_id && (
              <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-50">
                Nació de una consulta registrada el {detail.start_date}.
              </p>
            )}
          </div>

          {/* Documentos */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Documentos</h4>
            <div className="flex flex-col gap-2">
              {detail.documents.length ? (
                detail.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate block"
                      >
                        {doc.name}
                      </a>
                      <p className="text-[11px] text-slate-400 mt-0.5">{doc.date} · {doc.uploaded_by}</p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        title="Eliminar documento"
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Sin documentos todavía.</p>
              )}

              {canCreate && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                    {uploading ? "Subiendo..." : "Subir documento (PDF, Word o imagen)"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Línea de tiempo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Línea de tiempo del tratamiento</h4>
            <span className="text-[11px] text-slate-400">Más reciente primero</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Las evoluciones marcadas <em>desde consulta</em> se agregan solas cuando el médico guarda una consulta de seguimiento.
          </p>
          <TreatmentTimeline
            entries={detail.timeline}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEditNote={(entry) => {
              setEditingEntry(entry);
              setOpenModal("note");
            }}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </div>

      {/* Modales */}
      <TreatmentTextModal
        isOpen={openModal === "note"}
        onClose={closeModal}
        icon={StickyNote}
        iconBg="bg-amber-50 text-amber-600"
        title={editingEntry ? "Editar nota" : "Registrar nota"}
        placeholder="Escribe una nota sobre este tratamiento (llamada, resultado, observación)..."
        initialValue={editingEntry?.text || ""}
        submitLabel={editingEntry ? "Guardar cambios" : "Agregar nota"}
        successMessage={editingEntry ? "Nota actualizada" : "Nota agregada"}
        onSubmit={async (text) => {
          if (editingEntry) {
            await actions.update_note(detail.id, editingEntry.id, text);
          } else {
            await actions.add_note(detail.id, text);
          }
          await refresh();
          onRefetchList();
        }}
      />

      <TreatmentTextModal
        isOpen={openModal === "pause"}
        onClose={closeModal}
        icon={Pause}
        iconBg="bg-slate-100 text-slate-600"
        title="Pausar el tratamiento"
        placeholder="Motivo de la pausa (embarazo, espera de exámenes, viaje del paciente)..."
        submitLabel="Pausar tratamiento"
        successMessage="Tratamiento pausado"
        onSubmit={async (text) => {
          await actions.set_status(detail.id, { status: "en_pausa", pause_note: text });
          await refresh();
          onRefetchList();
        }}
      />

      <ScheduleControlModal
        isOpen={openModal === "control"}
        onClose={closeModal}
        initialValue={detail.next_control_iso}
        onSubmit={async (date) => {
          await actions.schedule_control(detail.id, date);
          await refresh();
          onRefetchList();
        }}
      />

      <EditPlanModal
        isOpen={openModal === "editPlan"}
        onClose={closeModal}
        initial={detail}
        onSubmit={async (payload) => {
          await actions.update_plan(detail.id, payload);
          await refresh();
          onRefetchList();
        }}
      />

      <CloseTreatmentModal
        isOpen={openModal === "close" || openModal === "derive"}
        onClose={closeModal}
        patientName={detail.patient_name}
        initialReason={openModal === "derive" ? "derivacion" : "finalizado"}
        onSubmit={async (payload) => {
          await actions.set_status(detail.id, payload);
          await refresh();
          onRefetchList();
        }}
      />
    </div>
  );
};

export default TreatmentDetail;
