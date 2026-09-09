import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Activity, Users, Leaf, Stethoscope, Info, Droplet, Download } from "lucide-react";
import InputField from "@/components/ui/InputField";
import {
  addMyPathological, updateMyPathological, deleteMyPathological,
  addMyHereditary, updateMyHereditary, deleteMyHereditary,
  updateMyLifestyle,
} from "@/services/profileService";
import { showSuccess, showError, confirmAction } from "@/lib/alerts";
import { descargarHistorialClinicoPdf } from "@/lib/pdf/patientDocuments";

const PARENTESCOS = [
  "Madre", "Padre", "Hermano/a", "Abuelo/a materno", "Abuelo/a paterno",
  "Tío/a", "Primo/a", "Hijo/a",
];
const MAX = 300;

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;

const SectionHead = ({ title, onAdd }) => (
  <div className="flex items-center justify-between mt-6 first:mt-1 mb-2.5">
    <span className="text-sm font-bold text-gray-800">{title}</span>
    {onAdd && (
      <button onClick={onAdd} className="flex items-center gap-1 text-xs font-semibold text-[#3B6FCA] hover:text-[#2d5ab5]">
        <Plus className="w-3.5 h-3.5" /> Agregar
      </button>
    )}
  </div>
);

const Item = ({ icon: Icon, iconClass = "bg-[#3B6FCA]/10 text-[#3B6FCA]", title, meta, onEdit, onDelete, deleting }) => (
  <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 mb-2">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
      {meta && <p className="text-xs text-gray-500 truncate mt-0.5">{meta}</p>}
    </div>
    {onEdit && (
      <button onClick={onEdit} disabled={deleting} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3B6FCA] hover:bg-[#3B6FCA]/10 disabled:opacity-50">
        <Pencil className="w-4 h-4" />
      </button>
    )}
    {onDelete && (
      <button onClick={onDelete} disabled={deleting} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    )}
  </div>
);

const BackLink = ({ onClick, children }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
    <ChevronLeft className="w-4 h-4" /> {children}
  </button>
);

const Notice = ({ children }) => (
  <div className="flex items-start gap-2 bg-[#3B6FCA]/5 rounded-xl p-3 mt-3">
    <Info className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
    <p className="text-xs text-gray-500">{children}</p>
  </div>
);

const HealthHistory = ({ patient, onChanged, onGoBloodType }) => {
  const [sub, setSub] = useState("lista");
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  // Id del registro que se está editando (null cuando el sub-formulario abierto
  // es para agregar uno nuevo).
  const [editingId, setEditingId] = useState(null);

  const [enf, setEnf] = useState({ disease: "", diagnosis: "" });
  const [ant, setAnt] = useState({ relationship: "Madre", condition: "" });
  const [estilo, setEstilo] = useState({
    non_pathological: patient?.clinical_history?.non_pathological || "",
    ecologycal_social: patient?.clinical_history?.ecologycal_social || "",
  });
  const [errors, setErrors] = useState({});

  const h = patient?.clinical_history || {};

  const eliminar = async (kind, entry, label) => {
    const ok = await confirmAction(`¿Eliminar "${label}"?`, { confirmLabel: "Sí, eliminar", danger: true });
    if (!ok) return;
    setDeletingId(entry._id);
    try {
      if (kind === "pathological") await deleteMyPathological(entry._id);
      else await deleteMyHereditary(entry._id);
      showSuccess("Registro eliminado.");
      onChanged?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el registro.");
    } finally {
      setDeletingId(null);
    }
  };

  // Abre el sub-formulario en modo agregar, con el estado limpio.
  const abrirAgregar = (tipo) => {
    setErrors({});
    setEditingId(null);
    if (tipo === "enfermedad") setEnf({ disease: "", diagnosis: "" });
    else setAnt({ relationship: "Madre", condition: "" });
    setSub(tipo);
  };

  // Abre el sub-formulario en modo edición, precargado con el registro.
  const editarEnfermedad = (item) => {
    setErrors({});
    setEditingId(item._id);
    setEnf({ disease: item.disease || "", diagnosis: item.diagnosis || "" });
    setSub("enfermedad");
  };
  const editarAntecedente = (item) => {
    setErrors({});
    setEditingId(item._id);
    setAnt({ relationship: item.relationship || "Madre", condition: item.condition || "" });
    setSub("antecedente");
  };

  const cerrarSubformulario = () => {
    setSub("lista");
    setEditingId(null);
    setErrors({});
  };

  const guardarEnfermedad = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!enf.disease.trim()) { setErrors({ disease: "Escribe el nombre de la enfermedad" }); return; }
    setSaving(true);
    try {
      const disease = enf.disease.trim();
      const diagnosis = enf.diagnosis.trim() || null;
      if (editingId) {
        await updateMyPathological(editingId, disease, diagnosis);
        showSuccess("Enfermedad actualizada.");
      } else {
        await addMyPathological(disease, diagnosis);
        showSuccess("Enfermedad agregada.");
      }
      setEnf({ disease: "", diagnosis: "" });
      setErrors({});
      setEditingId(null);
      onChanged?.();
      setSub("lista");
    } catch (err) {
      showError(err.message || "No se pudo guardar la enfermedad.");
    } finally {
      setSaving(false);
    }
  };

  const guardarAntecedente = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!ant.condition.trim()) { setErrors({ condition: "Escribe la condición o enfermedad" }); return; }
    setSaving(true);
    try {
      const condition = ant.condition.trim();
      if (editingId) {
        await updateMyHereditary(editingId, ant.relationship, condition);
        showSuccess("Antecedente actualizado.");
      } else {
        await addMyHereditary(ant.relationship, condition);
        showSuccess("Antecedente agregado.");
      }
      setAnt({ relationship: "Madre", condition: "" });
      setErrors({});
      setEditingId(null);
      onChanged?.();
      setSub("lista");
    } catch (err) {
      showError(err.message || "No se pudo guardar el antecedente.");
    } finally {
      setSaving(false);
    }
  };

  const guardarEstilo = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateMyLifestyle(estilo.non_pathological.trim(), estilo.ecologycal_social.trim());
      showSuccess("Información guardada.");
      onChanged?.();
      setSub("lista");
    } catch (err) {
      showError(err.message || "No se pudo guardar tu información.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Sub-formularios ----------
  if (sub === "enfermedad") {
    return (
      <div className="max-w-xl">
        <BackLink onClick={cerrarSubformulario}>Volver a historia clínica</BackLink>
        <form onSubmit={guardarEnfermedad} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">
            {editingId ? "Editar enfermedad crónica" : "Agregar enfermedad crónica"}
          </h2>
          <div className="flex flex-col gap-4">
            <InputField
              label="Nombre de la enfermedad"
              value={enf.disease}
              onChange={(e) => { setEnf((p) => ({ ...p, disease: e.target.value })); setErrors({}); }}
              placeholder="Ej. Hipertensión arterial"
              error={errors.disease}
            />
            <div>
              <InputField
                label="Diagnóstico (opcional)"
                value={enf.diagnosis}
                maxLength={50}
                onChange={(e) => { setEnf((p) => ({ ...p, diagnosis: e.target.value.slice(0, 50) })); setErrors({}); }}
                placeholder="Ej. Confirmado en 2019"
                error={errors.diagnosis}
              />
              <p className="text-xs text-gray-400 mt-1.5">Déjalo vacío si no aplica. Máximo 50 caracteres.</p>
            </div>
          </div>
          <Notice>Registra solo condiciones diagnosticadas por un médico. Esta información se muestra al personal de la clínica durante tus consultas.</Notice>
          <button type="submit" disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Guardar cambios" : "Guardar"}
          </button>
        </form>
      </div>
    );
  }

  if (sub === "antecedente") {
    // El personal de la clínica puede haber guardado un parentesco que no está
    // en la lista corta del portal, se agrega para no perderlo al editar.
    const opcionesParentesco = PARENTESCOS.includes(ant.relationship)
      ? PARENTESCOS
      : [ant.relationship, ...PARENTESCOS];
    return (
      <div className="max-w-xl">
        <BackLink onClick={cerrarSubformulario}>Volver a historia clínica</BackLink>
        <form onSubmit={guardarAntecedente} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">
            {editingId ? "Editar antecedente familiar" : "Agregar antecedente familiar"}
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Parentesco</label>
              <select
                value={ant.relationship}
                onChange={(e) => setAnt((p) => ({ ...p, relationship: e.target.value }))}
                className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
              >
                {opcionesParentesco.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <InputField
              label="Condición o enfermedad"
              value={ant.condition}
              onChange={(e) => { setAnt((p) => ({ ...p, condition: e.target.value })); setErrors({}); }}
              placeholder="Ej. Diabetes tipo 2"
              error={errors.condition}
            />
          </div>
          <Notice>Los antecedentes familiares ayudan al médico a identificar riesgos hereditarios. Agrega un registro por cada familiar y condición.</Notice>
          <button type="submit" disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Guardar cambios" : "Guardar"}
          </button>
        </form>
      </div>
    );
  }

  if (sub === "estilo") {
    return (
      <div className="max-w-xl">
        <BackLink onClick={() => setSub("lista")}>Volver a historia clínica</BackLink>
        <form onSubmit={guardarEstilo} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">Estilo de vida y entorno</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hábitos</label>
          <p className="text-xs text-gray-400 mb-2">Tabaco, alcohol, alimentación, ejercicio y horas de sueño.</p>
          <textarea
            rows={3}
            maxLength={MAX}
            value={estilo.non_pathological}
            onChange={(e) => setEstilo((p) => ({ ...p, non_pathological: e.target.value }))}
            placeholder="Ej. No fumo, camino 30 minutos al día, dieta balanceada."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white resize-none outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
          />
          <p className="text-[11px] text-gray-400 text-right mt-1">{estilo.non_pathological.length}/{MAX}</p>

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Entorno y vivienda</label>
          <p className="text-xs text-gray-400 mb-2">Tipo de vivienda, agua potable, saneamiento, animales y personas con las que vives.</p>
          <textarea
            rows={3}
            maxLength={MAX}
            value={estilo.ecologycal_social}
            onChange={(e) => setEstilo((p) => ({ ...p, ecologycal_social: e.target.value }))}
            placeholder="Ej. Casa de sistema mixto, agua potable, vivo con 3 personas y un perro."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white resize-none outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all"
          />
          <p className="text-[11px] text-gray-400 text-right mt-1">{estilo.ecologycal_social.length}/{MAX}</p>

          <Notice>Estos datos forman parte de tus antecedentes no patológicos y ayudan al médico a entender tu contexto de salud.</Notice>
          <button type="submit" disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </form>
      </div>
    );
  }

  // Descargar el PDF del historial clínico. El botón solo se muestra cuando ya
  // hay signos vitales registrados, es decir, después de la primera consulta.
  const puedeDescargarHistorial = !!patient?.clinical_history?.vital_signs?.length;
  const descargarHistorial = () => {
    try {
      descargarHistorialClinicoPdf(patient);
    } catch (err) {
      showError(err.message || "No se pudo generar tu historial clínico.");
    }
  };

  // ---------- Lista ----------
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-base font-bold text-gray-900">Historia clínica</h2>
        {puedeDescargarHistorial && (
          <button
            onClick={descargarHistorial}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#3B6FCA] hover:text-[#2d5ab5] flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Descargar historial clínico
          </button>
        )}
      </div>

      <SectionHead title="Tipo de sangre" />
      <button onClick={onGoBloodType} className="w-full flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:border-[#3B6FCA]/40 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
          <Droplet className="w-4 h-4 fill-red-500" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-800">{h.blood_type || "Sin registrar"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{h.blood_type ? "Ver compatibilidad y detalle" : "Tocar para registrarlo"}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </button>

      <SectionHead title="Enfermedades crónicas" onAdd={() => abrirAgregar("enfermedad")} />
      {h.pathological?.length ? (
        h.pathological.map((item) => (
          <Item
            key={item._id}
            icon={Activity}
            title={item.disease}
            meta={item.diagnosis ? `Diagnóstico: ${item.diagnosis}` : null}
            onEdit={() => editarEnfermedad(item)}
            onDelete={() => eliminar("pathological", item, item.disease)}
            deleting={deletingId === item._id}
          />
        ))
      ) : (
        <p className="text-sm text-gray-400 py-2">No has registrado enfermedades crónicas.</p>
      )}

      <SectionHead title="Antecedentes familiares" onAdd={() => abrirAgregar("antecedente")} />
      {h.hereditary?.length ? (
        h.hereditary.map((item) => (
          <Item
            key={item._id}
            icon={Users}
            title={item.condition}
            meta={item.relationship}
            onEdit={() => editarAntecedente(item)}
            onDelete={() => eliminar("hereditary", item, item.condition)}
            deleting={deletingId === item._id}
          />
        ))
      ) : (
        <p className="text-sm text-gray-400 py-2">No has registrado antecedentes familiares.</p>
      )}

      <SectionHead title="Estilo de vida y entorno" />
      <button onClick={() => setSub("estilo")} className="w-full flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:border-[#3B6FCA]/40 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-[#3B6FCA]/10 text-[#3B6FCA] flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-800 truncate">{h.non_pathological || "Sin registrar"}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{h.ecologycal_social || "Tocar para completar"}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </button>

      <SectionHead title="Procedimientos" />
      {h.procedures?.length ? (
        h.procedures.map((item, i) => (
          <Item
            key={item._id || i}
            icon={Stethoscope}
            title={item.procedure_name}
            meta={[fmtFecha(item.date), item.doctor_name].filter(Boolean).join(" · ")}
          />
        ))
      ) : (
        <p className="text-sm text-gray-400 py-2">Aún no tienes procedimientos registrados.</p>
      )}

      <Notice>Los procedimientos y los signos vitales los registra el personal de la clínica durante tus consultas, por eso no puedes editarlos aquí.</Notice>
    </div>
  );
};

export default HealthHistory;
