import { useState } from "react";
import { X, Loader2, ClipboardList } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import useProcedures from "@/modules/procedures/hooks/useProcedures";
import { useDoctors } from "@/modules/doctors/hooks/useDoctors";

const EMPTY = { procedure_id: "", doctor_id: "", date: "", diagnosis: "", result: "", follow_up_date: "" };

const TODAY_STR = new Date().toISOString().split("T")[0];
const MIN_YEAR = 2000;
// Tope amplio para el control de seguimiento, que puede programarse
// varios años a futuro, pero sigue siendo un año real de 4 dígitos. Es
// justo el tipo de valor absurdo, años de 5 dígitos o más, que se cuela
// si no se limita el input de fecha.
const MAX_FOLLOW_UP_STR = `${new Date().getFullYear() + 5}-12-31`;
const MAX_FIELD_LENGTH = 200;

// Modal compacto para registrar un procedimiento ya realizado
// directamente en el expediente, en la pestaña Procedimientos, del mismo
// tamaño y con el mismo criterio que ProcedureModal.jsx: selects, un par
// de fechas y dos textos cortos, sin scroll vertical.
// El PUT del paciente (campo new_procedure) ya acepta exactamente estos
// campos.
const ProcedureRecordModal = ({ isOpen, onClose, patientId, onSaved }) => {
  const { procedures, loading: loadingProcedures, getProcedureById } = useProcedures();
  const { doctors, isLoading: loadingDoctors } = useDoctors();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { if (!loading) { setForm(EMPTY); setErrors({}); onClose(); } };

  const handleSave = async () => {
    if (loading || !form.procedure_id) return;

    const nextErrors = {};
    if (form.date && (form.date.length !== 10 || form.date < `${MIN_YEAR}-01-01` || form.date > TODAY_STR)) {
      nextErrors.date = `Debe ser una fecha real entre ${MIN_YEAR} y hoy`;
    }
    if (form.follow_up_date && (form.follow_up_date.length !== 10 || form.follow_up_date < `${MIN_YEAR}-01-01` || form.follow_up_date > MAX_FOLLOW_UP_STR)) {
      nextErrors.follow_up_date = "Fecha fuera de rango";
    }
    // El control de seguimiento tiene que ser posterior al procedimiento, no antes.
    if (form.date && form.follow_up_date && form.follow_up_date < form.date) {
      nextErrors.follow_up_date = "No puede ser antes de la fecha del procedimiento";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const procedure = getProcedureById(form.procedure_id);
      const doctor = doctors.find((d) => d._id === form.doctor_id);
      await apiClient(`/patients/${patientId}`, {
        method: "PUT",
        body: {
          new_procedure: {
            procedure_id: form.procedure_id,
            procedure_name: procedure?.name,
            doctor_id: form.doctor_id || undefined,
            doctor_name: doctor ? `${doctor.name} ${doctor.last_name}` : undefined,
            date: form.date || undefined,
            diagnosis: form.diagnosis || undefined,
            result: form.result || undefined,
            follow_up_date: form.follow_up_date || undefined,
          },
        },
      });
      showSuccess("Procedimiento registrado correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudo registrar el procedimiento");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors bg-white ${
      hasError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-blue-500"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Registrar procedimiento</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Procedimiento *</label>
                <select value={form.procedure_id} onChange={(e) => set("procedure_id", e.target.value)} className={inputClass(false)}>
                  <option value="">{loadingProcedures ? "Cargando..." : "Selecciona"}</option>
                  {procedures.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Doctor</label>
                <select value={form.doctor_id} onChange={(e) => set("doctor_id", e.target.value)} className={inputClass(false)}>
                  <option value="">{loadingDoctors ? "Cargando..." : "Selecciona"}</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} {d.last_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Fecha</label>
                <input
                  type="date"
                  min={`${MIN_YEAR}-01-01`}
                  max={TODAY_STR}
                  value={form.date}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Corta aquí mismo un año de más de 4 dígitos, antes de que
                    // ese valor llegue a entrar al estado del formulario.
                    if (val && val.length !== 10) return;
                    if (val && (val < `${MIN_YEAR}-01-01` || val > TODAY_STR)) return;
                    set("date", val);
                  }}
                  className={inputClass(errors.date)}
                />
                {errors.date && <p className="text-[11px] text-red-500">{errors.date}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Seguimiento</label>
                <input
                  type="date"
                  min={`${MIN_YEAR}-01-01`}
                  max={MAX_FOLLOW_UP_STR}
                  value={form.follow_up_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val.length !== 10) return;
                    if (val && (val < `${MIN_YEAR}-01-01` || val > MAX_FOLLOW_UP_STR)) return;
                    set("follow_up_date", val);
                  }}
                  className={inputClass(errors.follow_up_date)}
                />
                {errors.follow_up_date && <p className="text-[11px] text-red-500">{errors.follow_up_date}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Diagnóstico</label>
              <input type="text" maxLength={MAX_FIELD_LENGTH} value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} className={inputClass(false)} />
              <p className="text-[11px] text-gray-400 text-right">{form.diagnosis.length}/{MAX_FIELD_LENGTH}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Resultado</label>
              <input type="text" maxLength={MAX_FIELD_LENGTH} value={form.result} onChange={(e) => set("result", e.target.value)} className={inputClass(false)} />
              <p className="text-[11px] text-gray-400 text-right">{form.result.length}/{MAX_FIELD_LENGTH}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!form.procedure_id}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default ProcedureRecordModal;
