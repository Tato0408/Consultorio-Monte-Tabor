import { useFormContext } from "react-hook-form";
import { FileBox, Info } from "lucide-react";
import SectionCard from "./SectionCard";
import { maskClinicalText, maskDigitsOnly } from "@/lib/inputMasks";

const OBJECTIVE_MAX = 300;
const PLAN_MAX = 500;
// Dos años hacia adelante como tope de la fecha estimada, mismo criterio
// que la "próxima cita sugerida" de PrescriptionCard.
const maxEndDate = () => `${new Date().getFullYear() + 2}-12-31`;
const todayISO = () => new Date().toISOString().split("T")[0];

// Tarjeta "Plan de tratamiento" del formulario de consulta. Es el punto
// donde nace un tratamiento: si el paciente aún no tiene uno abierto, el
// médico marca la casilla y describe objetivo y plan; el diagnóstico y la
// medicación de esta consulta se adjuntan solos en el backend
// (sync_treatment_from_consultation). Si el paciente ya tiene un
// tratamiento abierto, la tarjeta solo ofrece registrar la evolución de
// esta consulta en ese tratamiento.
//
// Todos los campos viven en react-hook-form bajo treatment_plan y viajan
// con el resto del formulario de consulta.
// Clase del borde de un campo: rojo cuando el campo tiene un error de
// validación pendiente, gris en cualquier otro caso.
const borderClass = (hasError) => (hasError ? "border-red-400" : "border-slate-200");

const TreatmentPlanCard = ({ readOnly, activeTreatment }) => {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const wants_create = watch("treatment_plan.create");

  // Aplica la máscara de texto clínico (sin símbolos ajenos a la
  // redacción) y actualiza react-hook-form. Mismo criterio que
  // PrescriptionCard y EvolutionCard.
  const maskChange = (path, maxLength) => (e) =>
    setValue(path, maskClinicalText(e.target.value, maxLength), { shouldValidate: true });

  if (activeTreatment) {
    return (
      <SectionCard icon={<FileBox size={16} />} title="Plan de tratamiento">
        <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-100 rounded-lg p-3 mb-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Este paciente tiene un tratamiento {activeTreatment.status === "en_pausa" ? "en pausa" : "activo"} desde el{" "}
            {activeTreatment.start_date}. <span className="font-semibold">Objetivo:</span> {activeTreatment.objective || "sin objetivo registrado"}.
          </p>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            disabled={readOnly}
            {...register("treatment_plan.link")}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b66d6] focus:ring-[#0b66d6]"
          />
          <span className="text-sm text-slate-700">
            Registrar la evolución de esta consulta en el tratamiento
          </span>
        </label>
      </SectionCard>
    );
  }

  const objectiveLen = (watch("treatment_plan.objective") || "").length;
  const planLen = (watch("treatment_plan.plan_description") || "").length;

  return (
    <SectionCard icon={<FileBox size={16} />} title="Plan de tratamiento - opcional">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          disabled={readOnly}
          {...register("treatment_plan.create")}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b66d6] focus:ring-[#0b66d6]"
        />
        <span className="text-sm font-medium text-slate-800">Este paciente inicia un plan de tratamiento</span>
      </label>
      <p className="text-xs text-slate-400 mt-1 ml-[26px]">
        Márcalo cuando el paciente necesitará varias visitas de seguimiento hasta el alta.
      </p>

      {wants_create && (
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Objetivo del tratamiento <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              maxLength={OBJECTIVE_MAX}
              disabled={readOnly}
              placeholder="Ej. Cicatrización completa de la úlcera venosa"
              {...register("treatment_plan.objective", {
                // Antes ningún campo de esta tarjeta era obligatorio: si quedaban vacíos,
                // la consulta se guardaba con éxito pero sync_treatment_from_consultation
                // callaba en silencio sin crear el tratamiento (ver treatmentSync.js) — el
                // médico creía que el plan había quedado registrado y no aparecía en
                // ningún lado.
                required: "El objetivo es obligatorio para iniciar un plan de tratamiento.",
              })}
              onChange={maskChange("treatment_plan.objective", OBJECTIVE_MAX)}
              className={`w-full border rounded-lg p-2 text-sm disabled:bg-slate-50 ${borderClass(errors?.treatment_plan?.objective)}`}
            />
            <div className="flex items-start justify-between gap-2 mt-0.5">
              {errors?.treatment_plan?.objective
                ? <p className="text-[11px] text-red-500">{errors.treatment_plan.objective.message}</p>
                : <span />}
              <p className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">{objectiveLen}/{OBJECTIVE_MAX}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Plan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              maxLength={PLAN_MAX}
              disabled={readOnly}
              placeholder="Ej. Curación avanzada cada 3 días + terapia compresiva"
              {...register("treatment_plan.plan_description", {
                required: "El plan es obligatorio para iniciar un plan de tratamiento.",
              })}
              onChange={maskChange("treatment_plan.plan_description", PLAN_MAX)}
              className={`w-full border rounded-lg p-2 text-sm disabled:bg-slate-50 ${borderClass(errors?.treatment_plan?.plan_description)}`}
            />
            <div className="flex items-start justify-between gap-2 mt-0.5">
              {errors?.treatment_plan?.plan_description
                ? <p className="text-[11px] text-red-500">{errors.treatment_plan.plan_description.message}</p>
                : <span />}
              <p className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">{planLen}/{PLAN_MAX}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Fecha estimada de finalización</label>
              <input
                type="date"
                disabled={readOnly}
                min={todayISO()}
                max={maxEndDate()}
                {...register("treatment_plan.estimated_end_date")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">N.º de sesiones</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                disabled={readOnly}
                placeholder="Ej. 10"
                {...register("treatment_plan.total_sessions")}
                onChange={(e) =>
                  setValue("treatment_plan.total_sessions", maskDigitsOnly(e.target.value, 3), { shouldValidate: true })
                }
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              El diagnóstico y la medicación de esta consulta se adjuntan solos al plan. Al guardar la
              consulta, el tratamiento queda activo y aparece en el módulo de Tratamientos.
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default TreatmentPlanCard;
