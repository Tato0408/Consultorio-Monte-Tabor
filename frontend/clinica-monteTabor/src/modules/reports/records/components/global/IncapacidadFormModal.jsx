import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, Loader2, FileClock } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

// Modal simple para crear una incapacidad (SickLeave) desde el expediente.
// Es un recurso independiente (patient_id + doctor_id), no depende de una
// consulta, por eso no reusa el flujo de /calendar/consultations.
const IncapacidadFormModal = ({ isOpen, onClose, patientId, doctorId, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { diagnosis: "", start_date: "", end_date: "" },
  });

  if (!isOpen) return null;

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await apiClient("/sick-leaves", {
        method: "POST",
        body: {
          patient_id: patientId,
          doctor_id: doctorId,
          diagnosis: data.diagnosis,
          start_date: data.start_date,
          end_date: data.end_date,
        },
      });
      showSuccess("Incapacidad registrada correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "Ocurrió un error al guardar la incapacidad");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
      hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileClock className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Nueva incapacidad</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Diagnóstico</label>
            <input
              type="text"
              placeholder="Ej. Gripe estacional"
              {...register("diagnosis", { required: "El diagnóstico es requerido" })}
              className={inputClass(errors.diagnosis)}
            />
            {errors.diagnosis && (
              <span className="text-[11px] text-red-500 font-medium">{errors.diagnosis.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Desde</label>
              <input
                type="date"
                {...register("start_date", { required: "Requerido" })}
                className={inputClass(errors.start_date)}
              />
              {errors.start_date && (
                <span className="text-[11px] text-red-500 font-medium">{errors.start_date.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Hasta</label>
              <input
                type="date"
                {...register("end_date", { required: "Requerido" })}
                className={inputClass(errors.end_date)}
              />
              {errors.end_date && (
                <span className="text-[11px] text-red-500 font-medium">{errors.end_date.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
};

export default IncapacidadFormModal;
