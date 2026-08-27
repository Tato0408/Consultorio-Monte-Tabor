import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { ArrowLeft } from "lucide-react";

import useConsultation from "../hooks/useConsultation";
import PatientHeader from "../components/PatientHeader";
import BloodTypeCard from "../components/BloodTypeCard";
import EvolutionCard from "../components/EvolutionCard";
import TriageCard from "../components/TriageCard";
import PhysicalExamCard from "../components/PhysicalExamCard";
import DiagnosisCard from "../components/DiagnosisCard";
import ProceduresCard from "../components/ProceduresCard";
import PrescriptionCard from "../components/PrescriptionCard";
import ReferralCard from "../components/ReferralCard";
import AntecedentsCard from "../components/AntecedentsCard";
import ConsultationActions from "../components/ConsultationActions";
import IncapacidadModal from "../components/IncapacidadModal";
import IncapacidadDocument from "../pdf/IncapacidadDocument";
import ConsultationDocument from "../pdf/ConsultationDocument";
import { openPdfInNewTab } from "../pdf/openPdfInNewTab";
import { showSuccess, showError } from "@/lib/alerts";
import { calculateAge } from "@/lib/validators";
import apiClient from "@/lib/apiClient";

const ConsultationForm = () => {
    const { appointmentId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Si viene el parámetro mode=view, el formulario queda en modo de
    // solo lectura, para solo consultar la información.
    const readOnly = searchParams.get("mode") === "view";

    const { appointment, defaultValues, save, isLoading, isSaving, error, hasExistingRecord } =
        useConsultation(appointmentId);

    // Refleja al instante lo que se guarda en BloodTypeCard sin
    // depender de recargar toda la cita. PatientHeader (solo lectura)
    // y BloodTypeCard (la tarjeta editable) son hermanos, así que el
    // valor se levanta hasta aquí para que ambos lo compartan.
    const [bloodTypeOverride, setBloodTypeOverride] = useState(null);
    const [isIncapacidadOpen, setIsIncapacidadOpen] = useState(false);


    // useForm arranca sin defaultValues porque la cita aún no ha
    // cargado en el primer render. Por eso se usa reset() en el
    // useEffect de abajo en cuanto useConsultation termina de traer
    // los datos.
    const methods = useForm({ defaultValues });

    useEffect(() => {
        if (error) {
            // Si terminó de cargar pero hay un error real (ej. error 500, error de red)
            showError(
                "Error de carga",
                "No se pudo obtener el registro clínico. Por favor, vuelve a intentarlo."
            ).then(() => {
                // Cuando el doctor confirma el aviso, lo redirige fuera
                // de esta pantalla.
                navigate("/calendar/consultations");
            });
        } else {
            // Si no hay error, carga los valores en el formulario normalmente
            methods.reset(defaultValues);
        }

        

        // Solo se re-ejecuta cuando isLoading cambia (no en cada render),
        // para no pisar lo que el doctor ya escribió.
    }, [isLoading]); 


    // Se ejecuta solo si handleSubmit valida que el form está bien formado.
    const onSubmit = async (formValues) => {
        if (isSaving) return;
        try {
            await save(formValues, { markCompleted: true });
            const successMsg = hasExistingRecord
                ? "Los cambios en la consulta han sido actualizados."
                : "La consulta médica ha sido registrada con éxito.";
            await showSuccess("¡Guardado!", successMsg);

            // Vuelve al listado de consultas (no se queda en la misma pantalla): quedarse
            // en la misma consulta en modo lectura se veía casi idéntico a como estaba
            // antes de guardar, y eso hacía dudar si el guardado realmente se envió.
            navigate("/calendar/consultations");
        } catch (err) {
            showError(
                "Error al guardar",
                err?.message || "No se pudo conectar con el servidor. Inténtalo de nuevo."
            );
        }
    };

    // Nombre completo del paciente y de quien atiende la cita, reutilizado por los dos
    // documentos PDF de abajo (incapacidad y consulta completa). Un procedimiento sin
    // doctor (requires_doctor false) lo atiende la enfermera asignada como proveedora
    // principal: firma los documentos con su propio nombre, igual que lo haría el doctor.
    const patient = appointment?.patient_id;
    const doctor = appointment?.doctor_id;
    const nurse = appointment?.nurse_id;
    const patientFullName = `${patient?.name || ""} ${patient?.last_name || ""}`.trim();
    const doctorFullName = doctor
        ? `${doctor.name || ""} ${doctor.last_name || ""}`.trim()
        : nurse
            ? `${nurse.name || ""} ${nurse.last_name || ""}`.trim()
            : "";
    const todayFormatted = new Date().toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    // Misma fecha, sin barras, para usarla en el título del PDF (se
    // vuelve el nombre sugerido al descargar), donde una barra podría
    // leerse como separador de carpetas en vez de parte del nombre.
    const todayFileSafe = todayFormatted.replace(/\//g, "-");

    // Campos mínimos para que cada documento tenga sentido clínico:
    // diagnóstico para la incapacidad, y esos mismos más la evolución
    // y los signos vitales obligatorios (presión y temperatura) para
    // el reporte completo. Antes de generar cualquiera de los dos PDFs
    // se validan solo esos campos (no todo el formulario), y si faltan
    // se marcan en rojo igual que al intentar guardar la consulta.
    const DIAGNOSIS_FIELDS = [
        "clinical_data.icd_diagnosis",
        "clinical_data.diagnosis",
        "clinical_data.diagnosis_description",
    ];
    const REPORT_REQUIRED_FIELDS = [
        ...DIAGNOSIS_FIELDS,
        "clinical_data.evolution",
        "clinical_data.triage.blood_pressure",
        "clinical_data.triage.temperature",
    ];

    // Botón "Vista previa e imprimir": genera el PDF de la consulta con
    // los datos cargados hasta el momento en el formulario y lo abre en
    // una pestaña nueva, en vez de imprimir la pantalla tal cual.
    const handlePreview = async () => {
        const isValid = await methods.trigger(REPORT_REQUIRED_FIELDS);
        if (!isValid) {
            showError(
                "Faltan campos obligatorios",
                "Completa la evolución, los signos vitales obligatorios y el diagnóstico antes de generar el reporte."
            );
            return;
        }

        try {
            const values = methods.getValues();
            await openPdfInNewTab(
                <ConsultationDocument
                    title={`Reporte de consulta de: ${patientFullName} ${todayFileSafe}`}
                    patientName={patientFullName}
                    age={calculateAge(patient?.birth_date)}
                    gender={patient?.gender}
                    dui={patient?.dui}
                    doctorName={doctorFullName}
                    date={todayFormatted}
                    vitals={{
                        weight: values?.clinical_data?.triage?.weight,
                        height: values?.clinical_data?.triage?.height,
                        oxygenSaturation: values?.clinical_data?.triage?.oxygen_saturation,
                        temperature: values?.clinical_data?.triage?.temperature,
                        bloodPressure: values?.clinical_data?.triage?.blood_pressure,
                        glucose: values?.clinical_data?.triage?.glucose,
                    }}
                    icdCode={values?.clinical_data?.icd_diagnosis}
                    historial={values?.clinical_data?.evolution}
                    diagnosis={values?.clinical_data?.diagnosis}
                    diagnosisDescription={values?.clinical_data?.diagnosis_description}
                    tratamiento={values?.prescription?.indications}
                    medications={values?.prescription?.medications}
                    labOrders={values?.prescription?.lab_orders}
                    referral={values?.referral}
                    antecedents={values?.antecedents}
                />
            );
        } catch (err) {
            showError("Error al generar el PDF", err?.message || "No se pudo generar el documento de la consulta.");
        }
    };

    // Botón "Generar incapacidad": primero valida que el diagnóstico
    // esté completo (Paso 4), y solo entonces abre el modal que pide
    // los días de reposo.
    const handleOpenIncapacidad = async () => {
        const isValid = await methods.trigger(DIAGNOSIS_FIELDS);
        if (!isValid) {
            showError(
                "Falta el diagnóstico",
                "Completa el diagnóstico (Paso 4) antes de generar la incapacidad."
            );
            return;
        }
        setIsIncapacidadOpen(true);
    };

    // Arma el PDF con el diagnóstico ya cargado en el formulario y los
    // días de reposo capturados en el modal, y además registra la
    // incapacidad como SickLeave real (antes solo se generaba el PDF,
    // sin guardar nada: esa incapacidad nunca aparecía en el
    // expediente del paciente, ver IncapacidadesTab.jsx).
    const handleGenerateIncapacidad = async (restDays) => {
        const values = methods.getValues();
        const diagnosisText = [values?.clinical_data?.diagnosis, values?.clinical_data?.diagnosis_description]
            .filter(Boolean)
            .join(". ");

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (Number(restDays) - 1));

        await apiClient("/sick-leaves", {
            method: "POST",
            body: {
                patient_id: patient?._id,
                doctor_id: doctor?._id,
                // Solo se manda si no hay doctor (procedimiento sin doctor, la enfermera
                // asignada es quien atendió y firma la incapacidad).
                nurse_id: !doctor && nurse ? nurse._id : undefined,
                diagnosis: diagnosisText || "Sin diagnóstico registrado",
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            },
        });

        await openPdfInNewTab(
            <IncapacidadDocument
                title={`Incapacidad de ${patientFullName} ${todayFileSafe}`}
                patientName={patientFullName}
                dui={patient?.dui}
                age={calculateAge(patient?.birth_date)}
                diagnosis={diagnosisText}
                restDays={restDays}
                doctorName={doctorFullName}
                date={todayFormatted}
            />
        );
    };

    if (isLoading) {
        return <div className="p-4 sm:p-8 text-slate-400">Cargando registro clínico...</div>;
    }

    return (
        // FormProvider expone methods (control, register, etc.) a todos
        // los hijos vía useFormContext(), sin tener que pasarlos por props.
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="p-4 sm:p-8">
                <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => navigate("/calendar/consultations")}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0b66d6] mb-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a consultas
                </button>

                <PatientHeader appointment={appointment} bloodTypeOverride={bloodTypeOverride} />

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                        {error}
                    </div>
                )}

                {/* fieldset con display:contents. Las tarjetas hijas solo reciben
                    readOnly (nunca isSaving), así que sin esto todo el expediente
                    quedaría editable mientras se envía. Desactiva todos los inputs
                    y botones de un solo golpe, sin alterar el layout de grid. */}
                <fieldset disabled={isSaving} className="contents">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    {/* Columna izquierda: flujo clínico principal */}
                    <div className="space-y-6">
                        <EvolutionCard readOnly={readOnly} />
                        <TriageCard readOnly={readOnly} />
                        <PhysicalExamCard readOnly={readOnly} />
                        <DiagnosisCard readOnly={readOnly} />
                        <ProceduresCard readOnly={readOnly} />

                        <AntecedentsCard
                            title="Paso 6 - Antecedentes heredofamiliarios - opcional"
                            name="antecedents.hereditary"
                            fields={[
                                { key: "relative", label: "Parentesco", maxLength: 50, placeholder: "Ej. Madre" },
                                { key: "condition", label: "Condición", maxLength: 50, placeholder: "Ej. Diabetes tipo 2" },
                            ]}
                            readOnly={readOnly}
                        />

                        <AntecedentsCard
                            title="Paso 7 - Antecedentes patológicos - opcional"
                            name="antecedents.pathological"
                            fields={[
                                { key: "disease", label: "Enfermedad", maxLength: 50, placeholder: "Ej. Apendicitis" },
                                { key: "type", label: "Tipo", maxLength: 30, placeholder: "Ej. Quirúrgico" },
                            ]}
                            readOnly={readOnly}
                        />
                    </div>

                    {/* Columna derecha: tipo de sangre, receta, referencia y antecedentes secundarios */}
                    <div className="space-y-6">
                        <BloodTypeCard
                            patientId={appointment?.patient_id?._id}
                            currentValue={bloodTypeOverride ?? appointment?.patient_id?.clinical_history?.blood_type}
                            onSaved={setBloodTypeOverride}
                            readOnly={readOnly}
                        />

                        <PrescriptionCard readOnly={readOnly} />
                        <ReferralCard readOnly={readOnly} />

                        <AntecedentsCard
                            title="Antecedentes no patológicos - opcional"
                            name="antecedents.non_pathological"
                            fields={[{ key: "description", label: "Descripción", maxLength: 300, placeholder: "Ej. Fuma 5 cigarrillos al día, consume alcohol ocasionalmente" }]}
                            readOnly={readOnly}
                        />

                        <AntecedentsCard
                            title="Antecedentes ecológico-sociales - opcional"
                            name="antecedents.socio_ecological"
                            fields={[{ key: "description", label: "Descripción", maxLength: 300, placeholder: "Ej. Vive en zona rural, sin acceso a agua potable" }]}
                            readOnly={readOnly}
                        />

                        <ConsultationActions
                            readOnly={readOnly}
                            isSaving={isSaving}
                            onFinish={methods.handleSubmit(onSubmit)}
                            onPreview={handlePreview}
                            onGenerateIncapacidad={handleOpenIncapacidad}
                        />
                    </div>
                </div>
                </fieldset>
            </form>

            <IncapacidadModal
                isOpen={isIncapacidadOpen}
                onClose={() => setIsIncapacidadOpen(false)}
                onSubmit={handleGenerateIncapacidad}
            />
        </FormProvider>
    );
};

export default ConsultationForm;