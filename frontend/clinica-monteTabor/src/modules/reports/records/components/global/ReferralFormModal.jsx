import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Loader2, ArrowLeftRight } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import { maskAlnum, maskClinicalText, maskPhone } from "@/lib/inputMasks";

const EMPTY = {
  referred_to: "",
  referred_date: "",
  reason: "",
  status: "Pendiente",
  referred_doctor_address: "",
  referred_doctor_phone: "",
  heart_rate: "",
  respiratory_rate: "",
};

// Modal para editar la referencia de una consulta ya guardada. No existe
// variante de "crear": una referencia solo nace dentro de una consulta (ver
// ResumenTab.jsx, botón Agregar que lleva al formulario de consulta). La
// referencia no tiene colección propia (vive embebida en Consultations, ver
// referral en consultation.js), por eso se guarda contra
// /consultations/:id/referral usando entry.consultationId.
const ReferralFormModal = ({ isOpen, onClose, entry, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY });

  // Mismas máscaras que el panel "Referencia" de la consulta: sin símbolos
  // sueltos. maskAlnum (solo letras/números) en dirección, FC y FR;
  // maskClinicalText (permite puntuación de frase) en referido a y motivo.
  const maskChange = (path, mask, maxLength) => (e) =>
    setValue(path, mask(e.target.value, maxLength), { shouldValidate: true });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      referred_to: entry?.referredToRaw || "",
      referred_date: entry?.referredDateRaw ? String(entry.referredDateRaw).split("T")[0] : "",
      reason: entry?.reasonRaw || "",
      status: entry?.statusRaw || "Pendiente",
      referred_doctor_address: entry?.referredDoctorAddressRaw || "",
      referred_doctor_phone: entry?.referredDoctorPhoneRaw || "",
      heart_rate: entry?.heartRateRaw || "",
      respiratory_rate: entry?.respiratoryRateRaw || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry?.id]);

  if (!isOpen) return null;

  const close = () => {
    reset(EMPTY);
    onClose();
  };

  const onSubmit = async (data) => {
    if (loading) return;
    setLoading(true);
    try {
      await apiClient(`/consultations/${entry.consultationId}/referral`, {
        method: "PUT",
        body: data,
      });
      showSuccess("Referencia actualizada correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "Ocurrió un error al guardar la referencia");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
      hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Editar referencia</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <fieldset disabled={loading} className="contents">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Referido a</label>
              <input
                type="text"
                placeholder="Ej. Dr. Pérez, Cardiología"
                maxLength={100}
                {...register("referred_to", { required: "Requerido", pattern: { value: /\S/, message: "Requerido" } })}
                onChange={maskChange("referred_to", maskClinicalText, 100)}
                className={inputClass(errors.referred_to)}
              />
              {errors.referred_to && (
                <span className="text-[11px] text-red-500 font-medium">{errors.referred_to.message}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Fecha de referencia</label>
                <input
                  type="date"
                  {...register("referred_date", { required: "Requerido" })}
                  className={inputClass(errors.referred_date)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Estado</label>
                <select {...register("status")} className={inputClass(false)}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completada">Completada</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Dirección del doctor referido</label>
              <input
                type="text"
                maxLength={200}
                placeholder="Ej. Hospital de Diagnóstico Colonia Médica San Salvador"
                {...register("referred_doctor_address")}
                onChange={maskChange("referred_doctor_address", maskAlnum, 200)}
                className={inputClass(false)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Teléfono del doctor referido</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="Ej. 2222-3333"
                {...register("referred_doctor_phone")}
                onChange={maskChange("referred_doctor_phone", maskPhone)}
                className={inputClass(false)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Frec. cardíaca</label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Ej. 78 lpm"
                  {...register("heart_rate")}
                  onChange={maskChange("heart_rate", maskAlnum, 20)}
                  className={inputClass(false)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Frec. respiratoria</label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Ej. 16 rpm"
                  {...register("respiratory_rate")}
                  onChange={maskChange("respiratory_rate", maskAlnum, 20)}
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Motivo de la referencia</label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Ej. Paciente requiere valoración cardiológica"
                {...register("reason", { required: "Requerido", pattern: { value: /\S/, message: "Requerido" } })}
                onChange={maskChange("reason", maskClinicalText, 500)}
                className={inputClass(errors.reason)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.reason ? (
                  <span className="text-[11px] text-red-500 font-medium">{errors.reason.message}</span>
                ) : <span />}
                <span className="text-[11px] text-gray-400 ml-auto">{(watch("reason") || "").length}/500</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cambios
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default ReferralFormModal;
