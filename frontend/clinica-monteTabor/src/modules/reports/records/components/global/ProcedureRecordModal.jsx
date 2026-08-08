import { useState } from "react";
import { X, Loader2, ClipboardList } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import useProcedures from "@/modules/procedures/hooks/useProcedures";
import { useDoctors } from "@/modules/doctors/hooks/useDoctors";

const EMPTY = { procedure_id: "", doctor_id: "", date: "", diagnosis: "", result: "", follow_up_date: "" };

// Modal compacto para registrar un procedimiento ya realizado directamente en el expediente
// (tab "Procedimientos") — mismo tamaño/criterio que ProcedureModal.jsx (la referencia que
// pediste seguir): selects + un par de fechas + dos textos cortos, sin scroll vertical.
// PUT /patients/:id (new_procedure) ya acepta exactamente estos campos.
const ProcedureRecordModal = ({ isOpen, onClose, patientId, onSaved }) => {
  const { procedures, loading: loadingProcedures, getProcedureById } = useProcedures();
  const { doctors, isLoading: loadingDoctors } = useDoctors();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { if (!loading) { setForm(EMPTY); onClose(); } };

  const handleSave = async () => {
    if (loading || !form.procedure_id) return;
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

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white";

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
                <select value={form.procedure_id} onChange={(e) => set("procedure_id", e.target.value)} className={inputClass}>
                  <option value="">{loadingProcedures ? "Cargando..." : "Selecciona"}</option>
                  {procedures.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Doctor</label>
                <select value={form.doctor_id} onChange={(e) => set("doctor_id", e.target.value)} className={inputClass}>
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
                <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Seguimiento</label>
                <input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Diagnóstico</label>
              <input type="text" value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Resultado</label>
              <input type="text" value={form.result} onChange={(e) => set("result", e.target.value)} className={inputClass} />
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
