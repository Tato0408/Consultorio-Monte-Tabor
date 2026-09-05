import { useState, useRef } from "react";
import { User, X, CheckCircle2, Circle, RefreshCcw, FileEdit, CalendarPlus, LogOut, StickyNote, Pencil, Trash2, Paperclip, FileText, Loader2 } from "lucide-react";
import StatusBadge from "../../reports/components/StatusBadge";
import { STATUS_STYLE } from "../data/treatmentsData";
import TreatmentTextModal from "./TreatmentTextModal";
import ScheduleControlModal from "./ScheduleControlModal";
import { showSuccess, showError, confirmDelete, confirmDischarge } from "@/lib/alerts";

const TABS = ["Resumen", "Evolución", "Notas", "Documentos"];

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-xs text-slate-400">{label}</span>
    <span className="text-xs font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

// Boton pequeño de icono para editar o eliminar, reutilizado en Evolucion y
// en cada nota. Las clases van completas (no interpoladas por "tone")
// porque Tailwind solo detecta clases que aparecen literalmente en el
// codigo fuente. Un template string como `text-${tone}-400` nunca
// terminaria en el CSS compilado.
const TONE_CLASSES = {
  blue: "text-blue-400 hover:text-blue-600 hover:bg-blue-50",
  red: "text-red-400 hover:text-red-600 hover:bg-red-50",
};

const IconAction = ({ icon: Icon, label, onClick, tone }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`p-1.5 rounded-lg transition-colors ${TONE_CLASSES[tone]}`}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

// Las acciones del panel (actualizar evolucion, agregar nota, programar
// control, cambiar estado, dar de alta, ademas de editar y eliminar la
// evolucion y cada nota) escriben sobre el tratamiento o procedimiento mas
// reciente del paciente en el backend (ver treatmentsController.js). Cada
// una abre su propio modal, confirmacion o selector y, al guardar, el
// padre (TreatmentsPage) refresca la lista completa.
const PatientTreatmentPanel = ({
  patient,
  // Permiso inventory.treatments. Si el rol no tiene la acción
  // correspondiente, el botón/ícono ni se muestra (el backend lo
  // rechaza igual, esto solo evita ofrecer algo que va a dar 403).
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  onClose,
  onUpdateEvolution,
  onDeleteEvolution,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUploadDocument,
  onDeleteDocument,
  onScheduleControl,
  onSetStatus,
  onDischarge,
}) => {
  const [tab, setTab] = useState("Resumen");
  // Valores posibles: "evolution", "note", "control" o null
  const [openModal, setOpenModal] = useState(null);
  // Si es null, el modal de nota esta en modo agregar. Si tiene un id, esta
  // editando esa nota puntual.
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const fileInputRef = useRef(null);

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-sm text-slate-400 h-[400px] flex items-center justify-center">
        Selecciona un paciente de la lista para ver su seguimiento.
      </div>
    );
  }

  const closeModal = () => {
    setOpenModal(null);
    setEditingNoteId(null);
  };

  const openNoteModal = (noteId = null) => {
    setEditingNoteId(noteId);
    setOpenModal("note");
  };

  const editingNote = editingNoteId ? patient.notes?.find((n) => n.id === editingNoteId) : null;

  // Acciones directas (sin modal): piden confirmacion, hacen la llamada y
  // muestran su propio mensaje de exito o error, igual que "Dar de alta".
  const handleDeleteEvolution = async () => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar la evolución?",
      text: "Se borrará el texto de evolución actual de este tratamiento.",
    });
    if (!confirmed) return;
    try {
      await onDeleteEvolution();
      showSuccess("Evolución eliminada");
    } catch (err) {
      showError(err.message || "No se pudo eliminar la evolución");
    }
  };

  const handleDeleteNote = async (noteId) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar esta nota?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;
    try {
      await onDeleteNote(noteId);
      showSuccess("Nota eliminada");
    } catch (err) {
      showError(err.message || "No se pudo eliminar la nota");
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo dos veces seguidas
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      await onUploadDocument(file);
      showSuccess("Documento subido");
    } catch (err) {
      showError(err.message || "No se pudo subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este documento?",
      text: "El archivo se borrará permanentemente.",
    });
    if (!confirmed) return;
    try {
      await onDeleteDocument(documentId);
      showSuccess("Documento eliminado");
    } catch (err) {
      showError(err.message || "No se pudo eliminar el documento");
    }
  };

  const handleChangeStatus = async (e) => {
    const status = e.target.value;
    setChangingStatus(true);
    try {
      await onSetStatus(status);
      showSuccess(status === "auto" ? "Estado vuelto a automático" : "Estado actualizado");
    } catch (err) {
      showError(err.message || "No se pudo cambiar el estado");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDischarge = async () => {
    const confirmed = await confirmDischarge();
    if (!confirmed) return;
    try {
      await onDischarge();
      showSuccess("Paciente dado de alta");
    } catch (err) {
      showError(err.message || "No se pudo dar de alta al paciente");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{patient.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {patient.age != null ? `${patient.age} años` : "Edad no registrada"} · {patient.gender}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label={patient.status} color={STATUS_STYLE[patient.status] ?? "gray"} />
          {/* No existía ningún lugar del sistema donde este estado se
              pudiera configurar: getFollowUp siempre lo calculaba solo a
              partir de follow_up_date (ver treatmentsController.js). Este
              selector permite fijarlo a mano cuando el cálculo automático
              no aplica a un caso puntual, y "Automático" lo borra para
              volver al cálculo por fecha. */}
          {canUpdate && (
            <select
              value={patient.statusIsManual ? patient.status : "auto"}
              onChange={handleChangeStatus}
              disabled={changingStatus}
              className="text-[11px] font-semibold text-slate-500 border border-slate-200 rounded-lg px-1.5 py-1 disabled:opacity-60"
            >
              <option value="auto">Automático (según fecha de control)</option>
              <option value="En tratamiento">En tratamiento</option>
              <option value="Requiere revisión">Requiere revisión</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-2.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        {tab === "Resumen" && (
          <>
            {/* Información clínica */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Información clínica</h4>
              <div className="divide-y divide-slate-50">
                <InfoRow label="Diagnóstico" value={patient.clinicalInfo.diagnostico} />
                <InfoRow label="Médico responsable" value={patient.clinicalInfo.medicoResponsable} />
                <InfoRow label="Fecha de inicio" value={patient.clinicalInfo.fechaInicio} />
                <InfoRow label="Fecha estimada de alta" value={patient.clinicalInfo.fechaEstimadaAlta} />
              </div>
            </div>

            {/* Tratamiento actual */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Tratamiento actual</h4>
              <div className="flex flex-col gap-2.5">
                {patient.treatmentItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-xs text-slate-400 leading-tight mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seguimiento del tratamiento */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Seguimiento del tratamiento</h4>
              <div className="flex flex-col gap-3">
                {patient.followUpSteps.map((step, i) => {
                  const done = step.status === "Completado";
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 leading-tight">{step.label}</p>
                          <StatusBadge label={step.status} color={done ? "green" : "blue"} />
                        </div>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Última observación */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Última observación</h4>
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-slate-600 leading-relaxed">{patient.lastObservation.text}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {patient.lastObservation.date} · {patient.lastObservation.author}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Se llena con el boton "Actualizar evolucion" (PATCH
            /treatments/:id/evolution). Usa el mismo formato de tarjeta que
            una nota: texto, fecha, autor y botones de editar y eliminar. */}
        {tab === "Evolución" && (
          patient.evolution?.text ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{patient.evolution.text}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-slate-400">{patient.evolution.date} · {patient.evolution.author}</p>
                <div className="flex items-center gap-0.5 -mr-1.5">
                  {canUpdate && <IconAction icon={Pencil} label="Editar evolución" onClick={() => setOpenModal("evolution")} tone="blue" />}
                  {canDelete && <IconAction icon={Trash2} label="Eliminar evolución" onClick={handleDeleteEvolution} tone="red" />}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">
              Todavía no se ha registrado una evolución. Usa "Actualizar evolución" para agregar la primera.
            </p>
          )
        )}

        {/* Se llena con el boton "Agregar nota" (POST /treatments/:id/notes).
            Es una bitacora acumulada. */}
        {tab === "Notas" && (
          patient.notes?.length ? (
            <div className="flex flex-col gap-3">
              {patient.notes.map((note) => (
                <div key={note.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-slate-400">{note.date} · {note.author}</p>
                    <div className="flex items-center gap-0.5 -mr-1.5">
                      {canUpdate && <IconAction icon={Pencil} label="Editar nota" onClick={() => openNoteModal(note.id)} tone="blue" />}
                      {canDelete && <IconAction icon={Trash2} label="Eliminar nota" onClick={() => handleDeleteNote(note.id)} tone="red" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">
              Sin notas todavía. Usa "Agregar nota" para dejar la primera.
            </p>
          )
        )}

        {/* Documentos reales almacenados en Cloudinary (ver
            treatmentsController.uploadDocument y CloudinaryDocumentConfig.js). */}
        {tab === "Documentos" && (
          <div className="flex flex-col gap-3">
            {patient.documents?.length ? (
              patient.documents.map((doc) => (
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
                    <p className="text-[11px] text-slate-400 mt-0.5">{doc.date} · {doc.uploadedBy}</p>
                  </div>
                  {canDelete && (
                    <IconAction icon={Trash2} label="Eliminar documento" onClick={() => handleDeleteDocument(doc.id)} tone="red" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">
                {canCreate ? "Sin documentos todavía. Sube el primero abajo." : "Sin documentos todavía."}
              </p>
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
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                  {uploading ? "Subiendo..." : "Subir documento (PDF, Word o imagen, máx. 10 MB)"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      {(canCreate || canUpdate) && (
        <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => setOpenModal("evolution")}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Actualizar evolución
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => openNoteModal(null)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Agregar nota
            </button>
          )}
          {canUpdate && (
            <button
              type="button"
              onClick={() => setOpenModal("control")}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Programar control
            </button>
          )}
          {canUpdate && (
            <button
              type="button"
              onClick={handleDischarge}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Dar de alta
            </button>
          )}
        </div>
      )}

      <TreatmentTextModal
        isOpen={openModal === "evolution"}
        onClose={closeModal}
        icon={RefreshCcw}
        iconBg="bg-blue-50 text-blue-600"
        title="Actualizar evolución"
        placeholder="Describe cómo va evolucionando el tratamiento..."
        initialValue={patient.evolution?.text || ""}
        submitLabel="Guardar evolución"
        successMessage="Evolución actualizada"
        onSubmit={onUpdateEvolution}
      />

      {/* Mismo modal para "Agregar nota" y "Editar nota", cambia segun editingNoteId. */}
      <TreatmentTextModal
        isOpen={openModal === "note"}
        onClose={closeModal}
        icon={StickyNote}
        iconBg="bg-amber-50 text-amber-600"
        title={editingNoteId ? "Editar nota" : "Agregar nota"}
        placeholder="Escribe una nota sobre este tratamiento..."
        initialValue={editingNote?.text || ""}
        submitLabel={editingNoteId ? "Guardar cambios" : "Agregar nota"}
        successMessage={editingNoteId ? "Nota actualizada" : "Nota agregada"}
        onSubmit={(text) => (editingNoteId ? onUpdateNote(editingNoteId, text) : onAddNote(text))}
      />

      <ScheduleControlModal
        isOpen={openModal === "control"}
        onClose={closeModal}
        initialValue={patient.nextControlISO}
        onSubmit={onScheduleControl}
      />
    </div>
  );
};

export default PatientTreatmentPanel;
