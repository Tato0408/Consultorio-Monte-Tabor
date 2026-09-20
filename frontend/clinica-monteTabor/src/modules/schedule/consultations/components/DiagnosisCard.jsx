import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";
import CieDiagnosisCombobox from "./CieDiagnosisCombobox";

// showNurseNote (prop): la nota de enfermería solo se muestra a la enfermera
// (ver ConsultationForm.jsx). canEditNurseNote decide si el textarea y el
// botón están activos. onSaveNurseNote persiste solo ese campo por un
// endpoint aparte, sin pasar por el guardado de la consulta.
const DiagnosisCard = ({
    readOnly,
    showNurseNote = false,
    nurseNote = "",
    nurseNoteAt = null,
    canEditNurseNote = false,
    nurseNoteHint = "",
    onSaveNurseNote,
    savingNurseNote = false,
}) => {
    const { register, setValue, watch, formState: { errors } } = useFormContext();

    const icdCode = watch("clinical_data.icd_diagnosis");

    // Borrador local del textarea de la nota de enfermería, sembrado de lo ya
    // guardado y resincronizado cuando cambia desde afuera (ej. tras guardar).
    const [noteDraft, setNoteDraft] = useState(nurseNote || "");
    useEffect(() => {
        setNoteDraft(nurseNote || "");
    }, [nurseNote]);

    // Al elegir un código en el combobox se fija el código y se PRE-LLENA el
    // nombre con la descripción oficial CIE-10. El nombre queda editable, pero
    // solo después de haber elegido un código (ver el input de abajo). Si se
    // limpia la selección, se limpia también el nombre.
    const handleCieChange = ({ code, name }) => {
        setValue("clinical_data.icd_diagnosis", code, { shouldValidate: true, shouldDirty: true });
        setValue("clinical_data.diagnosis", code ? name : "", { shouldValidate: true, shouldDirty: true });
    };

    return (
        <SectionCard title="Paso 4 - Impresión diagnóstica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">
                        Diagnóstico (CIE-10) <span className="text-red-500">*</span>
                    </label>
                    {/* Input real para react-hook-form (validación + envío). El valor lo
                        maneja el combobox vía setValue; no se teclea a mano. */}
                    <input
                        type="hidden"
                        {...register("clinical_data.icd_diagnosis", {
                            required: "Elige un diagnóstico de la lista CIE-10",
                        })}
                    />
                    <CieDiagnosisCombobox
                        code={icdCode}
                        name={watch("clinical_data.diagnosis")}
                        onChange={handleCieChange}
                        disabled={readOnly}
                        error={!!errors?.clinical_data?.icd_diagnosis}
                    />
                    {errors?.clinical_data?.icd_diagnosis && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.icd_diagnosis.message}</p>
                    )}
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">
                        Nombre del diagnóstico <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        maxLength={300}
                        disabled={readOnly || !icdCode}
                        placeholder={icdCode ? "" : "Elige primero un código CIE-10"}
                        {...register("clinical_data.diagnosis", {
                            required: "El nombre del diagnóstico es obligatorio",
                        })}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                    <div className="flex items-start justify-between gap-2">
                        {errors?.clinical_data?.diagnosis ? (
                            <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.diagnosis.message}</p>
                        ) : <span />}
                        <span className="text-[11px] text-gray-400 mt-0.5 ml-auto">
                            {watch("clinical_data.diagnosis")?.length ?? 0}/300
                        </span>
                    </div>
                </div>
            </div>

            <label className="text-xs text-slate-500 block mb-1">
                Descripción / Observaciones diagnósticas <span className="text-red-500">*</span>
            </label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Eritema faríngeo con fiebre de 38°C de dos días de evolución"
                {...register("clinical_data.diagnosis_description", {
                    required: "La descripción del diagnóstico es obligatoria",
                })}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            <div className="flex items-start justify-between gap-2">
                {errors?.clinical_data?.diagnosis_description ? (
                    <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.diagnosis_description.message}</p>
                ) : <span />}
                <span className="text-[11px] text-gray-400 mt-0.5 ml-auto">
                    {watch("clinical_data.diagnosis_description")?.length ?? 0}/500
                </span>
            </div>

            {showNurseNote && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                        Nota de enfermería
                    </label>
                    <p className="text-[11px] text-slate-400 mb-1.5">
                        Solo la enfermera asignada la registra. El resto de la consulta no la ve.
                    </p>
                    <textarea
                        rows={3}
                        maxLength={500}
                        disabled={!canEditNurseNote}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Ej. Se administró anestésico local, el paciente toleró el procedimiento sin complicaciones"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
                    />
                    <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[11px] text-slate-400">
                            {nurseNoteAt
                                ? `Registrada el ${new Date(nurseNoteAt).toLocaleDateString("es-SV")}`
                                : ""}
                        </span>
                        <span className="text-[11px] text-gray-400">{noteDraft.length}/500</span>
                    </div>
                    {canEditNurseNote ? (
                        <button
                            type="button"
                            onClick={() => onSaveNurseNote?.(noteDraft)}
                            disabled={savingNurseNote || noteDraft.trim() === (nurseNote || "").trim()}
                            className="mt-1 bg-[#0b66d6] text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-[#0a59ba] disabled:opacity-50"
                        >
                            {savingNurseNote ? "Guardando..." : "Guardar nota"}
                        </button>
                    ) : (
                        nurseNoteHint && (
                            <p className="text-[11px] text-slate-400 mt-1">{nurseNoteHint}</p>
                        )
                    )}
                </div>
            )}
        </SectionCard>
    );
};

export default DiagnosisCard;
