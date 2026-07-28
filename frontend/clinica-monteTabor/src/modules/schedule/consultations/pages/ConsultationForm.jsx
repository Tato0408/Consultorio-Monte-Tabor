import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";

import useConsultation from "../hooks/useConsultation";
import PatientHeader from "../components/PatientHeader";
import EvolutionCard from "../components/EvolutionCard";
import TriageCard from "../components/TriageCard";
import PhysicalExamCard from "../components/PhysicalExamCard";
import DiagnosisCard from "../components/DiagnosisCard";
import ProceduresCard from "../components/ProceduresCard";
import PrescriptionCard from "../components/PrescriptionCard";
import ReferralCard from "../components/ReferralCard";
import AntecedentsCard from "../components/AntecedentsCard";
import ConsultationActions from "../components/ConsultationActions";
import { showSuccess, showError } from "@/lib/alerts";

const ConsultationForm = () => {
    const { appointmentId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    //si hay datos, se coloca en modo view solo para consultar la inforamcion
    const readOnly = searchParams.get("mode") === "view";

    const { appointment, defaultValues, save, isLoading, isSaving, error, hasExistingRecord } =
        useConsultation(appointmentId);


    // useForm sin defaultValues todavía: la cita aún no ha cargado en el
    // primer render. Por eso usamos reset() en el useEffect de abajo en
    // cuanto useConsultation termina de traer los datos.
    const methods = useForm({ defaultValues });

    useEffect(() => {
        if (error) {
            // Si terminó de cargar pero hay un error real (ej. error 500, error de red)
            showError(
                "Error de Carga",
                "No se pudo obtener el registro clínico. Por favor, vuelve a intentarlo."
            ).then(() => {
                // Cuando el doctor le da "OK" al botón del SweetAlert, lo sacamos de aquí
                navigate("/calendar/consultations");
            });
        } else {
            // Si no hay error, cargamos los valores en el formulario normalmente
            methods.reset(defaultValues);
        }

        

        // Solo se re-ejecuta cuando isLoading cambia (no en cada render),
        // para no pisar lo que el doctor ya escribió.
    }, [isLoading]); 


    // Se ejecuta solo si handleSubmit valida que el form está bien formado.
    const onSubmit = async (formValues) => {
        try {
            await save(formValues, { markCompleted: true });
            const successMsg = hasExistingRecord
                ? "Los cambios en la consulta han sido actualizados."
                : "La consulta médica ha sido registrada con éxito.";
            await showSuccess("¡Guardado!", successMsg);

            navigate("/calendar/consultations"); // vuelve al listado del día
        } catch (err) {
            showError(
                "Error al guardar",
                err?.message || "No se pudo conectar con el servidor. Inténtalo de nuevo."
            );
        }
    };

    const handlePreview = () => {
        window.print(); // placeholder simple; se puede cambiar por un modal de PDF
    };

    if (isLoading) {
        return <div className="p-4 sm:p-8 text-slate-400">Cargando registro clínico...</div>;
    }

    return (
        // FormProvider expone "methods" (control, register, etc.) a todos
        // los hijos vía useFormContext(), sin tener que pasarlos por props.
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="p-4 sm:p-8">
                <PatientHeader appointment={appointment} />

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    {/* Columna izquierda: flujo clínico principal */}
                    <div className="space-y-6">
                        <EvolutionCard readOnly={readOnly} />
                        <TriageCard readOnly={readOnly} />
                        <PhysicalExamCard readOnly={readOnly} />
                        <DiagnosisCard readOnly={readOnly} />
                        <ProceduresCard readOnly={readOnly} />

                        <AntecedentsCard
                            title="Antecedentes heredofamiliarios"
                            name="antecedents.hereditary"
                            fields={[
                                { key: "relative", label: "Parentesco" },
                                { key: "condition", label: "Condición" },
                            ]}
                            readOnly={readOnly}
                        />

                        <AntecedentsCard
                            title="Antecedentes patológicos"
                            name="antecedents.pathological"
                            fields={[
                                { key: "disease", label: "Enfermedad" },
                                { key: "type", label: "Tipo" },
                            ]}
                            readOnly={readOnly}
                        />
                    </div>

                    {/* Columna derecha: receta, referencia, antecedentes secundarios y acciones */}
                    <div className="space-y-6">
                        <PrescriptionCard readOnly={readOnly} />
                        <ReferralCard readOnly={readOnly} />

                        <AntecedentsCard
                            title="Antecedentes no patológicos"
                            name="antecedents.non_pathological"
                            fields={[{ key: "description", label: "Descripción" }]}
                            readOnly={readOnly}
                        />

                        <AntecedentsCard
                            title="Antecedentes ecológico-sociales"
                            name="antecedents.socio_ecological"
                            fields={[{ key: "description", label: "Descripción" }]}
                            readOnly={readOnly}
                        />

                        <ConsultationActions
                            readOnly={readOnly}
                            isSaving={isSaving}
                            onFinish={methods.handleSubmit(onSubmit)}
                            onPreview={handlePreview}
                        />
                    </div>
                </div>
            </form>
        </FormProvider>
    );
};

export default ConsultationForm;