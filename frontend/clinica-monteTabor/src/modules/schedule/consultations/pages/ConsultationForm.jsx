import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
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
import TreatmentPlanCard from "../components/TreatmentPlanCard";
import PrescriptionCard from "../components/PrescriptionCard";
import ReferralCard from "../components/ReferralCard";
import AntecedentsCard from "../components/AntecedentsCard";
import ConsultationActions from "../components/ConsultationActions";
import IncapacidadModal from "../components/IncapacidadModal";
import IncapacidadDocument from "../pdf/IncapacidadDocument";
import RecetaDocument from "../pdf/RecetaDocument";
import ReferenciaDocument from "../pdf/ReferenciaDocument";
import ConsultationDocument from "../pdf/ConsultationDocument";
import { openPdfInNewTab } from "../pdf/openPdfInNewTab";
import { pdfDateTime } from "../pdf/pdfDate";
import { showSuccess, showError } from "@/lib/alerts";
import { calculateAge } from "@/lib/validators";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useMySignatureAssets } from "@/lib/useMySignatureAssets";

// Borrador de la consulta en curso, guardado en sessionStorage al salir a
// "Generar orden de laboratorio" para no perder lo que el doctor llevaba
// escrito sin guardar. Caduca a las 2 horas.
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
const draftKey = (appointmentId) => `consultation-draft:${appointmentId}`;
const readConsultationDraft = (appointmentId) => {
    try {
        const raw = sessionStorage.getItem(draftKey(appointmentId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.values || Date.now() - (parsed.ts || 0) > DRAFT_TTL_MS) return null;
        return parsed.values;
    } catch {
        return null;
    }
};
const clearConsultationDraft = (appointmentId) => {
    try {
        sessionStorage.removeItem(draftKey(appointmentId));
    } catch {
        /* sessionStorage no disponible: nada que limpiar */
    }
};

// Une los hallazgos del examen físico (Paso 3) en un solo párrafo para la hoja
// de referencia. La clave neurológica está mal escrita en PhysicalExamCard
// ("neorulogical"), así que se leen ambas.
const buildPhysicalExamText = (pe = {}) =>
    [
        pe.general,
        pe.skin,
        pe.cardiopulmonary,
        pe.abdomen,
        pe.neorulogical || pe.neurological,
        pe.musculoskeletal,
        pe.notes,
    ]
        .map((piece) => String(piece || "").trim())
        .filter(Boolean)
        .join("; ");

// Lee un valor anidado ("referral.reason") del objeto de valores del formulario.
const getNested = (obj, path) => path.split(".").reduce((acc, key) => acc?.[key], obj);

const ConsultationForm = () => {
    const { appointmentId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission, userType } = useAuth();
    const { signatureUrl, sealUrl } = useMySignatureAssets();

    // Esta consulta se abrió desde la pestaña Consultas del expediente de un
    // paciente (RecordDetailPage.jsx manda fromRecords en location.state).
    const fromRecords = !!location.state?.fromRecords;

    // Registrar una consulta nueva exige "crear" en Consultas (y también en
    // Expediente si se abrió desde ahí). Editar una consulta ya registrada
    // exige además "actualizar" en los mismos módulos. El botón de la lista
    // siempre dice "Ver" para una consulta ya registrada: que además se pueda
    // editar depende de estos permisos, no del botón.
    const canCreateConsult = hasPermission("calendar.consultations", "create");
    const canUpdateConsult = hasPermission("calendar.consultations", "update");
    const canCreateRecords = hasPermission("reports.records", "create");
    const canUpdateRecords = hasPermission("reports.records", "update");
    // Controla si la tarjeta "Plan de tratamiento" aparece en el
    // formulario: sin permiso de Ingreso en Tratamientos, el médico/enfermera
    // no debe poder abrir un plan nuevo desde acá.
    const canCreateTreatment = hasPermission("inventory.treatments", "create");
    const canRegisterConsultation = canCreateConsult && (!fromRecords || canCreateRecords);
    const canEditExistingConsultation =
        canRegisterConsultation && canUpdateConsult && (!fromRecords || canUpdateRecords);

    // BloodTypeCard guarda aparte, contra PUT /patients/:id (blood_type es un campo del
    // historial clínico): ese endpoint exige reports.records en update, o users.patients en
    // update además de reports.records en create (ver patients.js/patientsController.js). No
    // es lo mismo que "puede editar la consulta" (canEditExistingConsultation, arriba): con
    // los permisos por defecto una enfermera puede editar la consulta pero solo tiene lectura
    // en ambos módulos de paciente, así que sin este chequeo la tarjeta se mostraba editable y
    // el guardado fallaba con 403 sin ningún aviso previo.
    const canSaveBloodType = canUpdateRecords || (canCreateRecords && hasPermission("users.patients", "update"));

    // Esta pantalla se abre desde dos lugares distintos: el listado de
    // Consultas (por defecto) o la pestaña Consultas del expediente de un
    // paciente (RecordDetailPage.jsx, que manda fromRecords + patientId en
    // el location.state al navegar acá). goBack() vuelve a donde
    // realmente se abrió en vez de mandar siempre al listado global.
    const goBack = () => {
        clearConsultationDraft(appointmentId);
        if (location.state?.fromRecords) {
            navigate("/reports/records", {
                state: { selectPatientId: location.state.patientId, selectTab: "Consultas" },
            });
        } else {
            navigate("/calendar/consultations");
        }
    };

    const { appointment, defaultValues, save, isLoading, isSaving, error, hasExistingRecord, consultationId, activeTreatment } =
        useConsultation(appointmentId);

    // El formulario queda en solo lectura si se pidió explícitamente
    // (mode=view), o si el rol no puede registrar la consulta (cuando es
    // nueva) ni editarla (cuando ya existe). En solo lectura, el botón de
    // guardar pasa a ser un "Finalizar" que solo cierra el formulario.
    const forcedView = searchParams.get("mode") === "view";
    const readOnly = forcedView
        || (hasExistingRecord ? !canEditExistingConsultation : !canRegisterConsultation);

    // Refleja al instante lo que se guarda en BloodTypeCard sin
    // depender de recargar toda la cita. PatientHeader (solo lectura)
    // y BloodTypeCard (la tarjeta editable) son hermanos, así que el
    // valor se levanta hasta aquí para que ambos lo compartan.
    const [bloodTypeOverride, setBloodTypeOverride] = useState(null);
    const [isIncapacidadOpen, setIsIncapacidadOpen] = useState(false);

    // Nota de enfermería: vive fuera de react-hook-form porque se guarda por
    // su propio endpoint (PATCH /consultations/:id/nurse-note) y no viaja con
    // el resto de la consulta. Solo la maneja la enfermera asignada.
    const isNurse = userType === "nurse";
    // Una cita puede combinar varios procedimientos (procedure_id es un array): alcanza
    // con que ALGUNO requiera enfermera.
    const needsNurseNote = !!((appointment?.procedure_id || []).some((p) => p.requires_nurse) && appointment?.nurse_id);
    const showNurseNote = isNurse && needsNurseNote;
    const [nurseNote, setNurseNote] = useState("");
    const [nurseNoteAt, setNurseNoteAt] = useState(null);
    const [savingNurseNote, setSavingNurseNote] = useState(false);


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
                goBack();
            });
        } else {
            // Si el doctor venía de "Generar orden de laboratorio", se restaura lo
            // que llevaba escrito sin guardar; si no, carga normalmente.
            const draft = readConsultationDraft(appointmentId);
            methods.reset(draft || defaultValues);
            // La nota de enfermería no forma parte del borrador ni del form.
            setNurseNote(defaultValues?.nurse_note || "");
            setNurseNoteAt(defaultValues?.nurse_note_at || null);
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

            // No se queda en la misma pantalla: quedarse en la misma consulta en modo
            // lectura se veía casi idéntico a como estaba antes de guardar, y eso hacía
            // dudar si el guardado realmente se envió. goBack() ya limpia el borrador y
            // vuelve a donde se abrió esta consulta (listado o expediente del paciente).
            goBack();
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
    // Fecha y hora de emisión: el documento se genera en este momento, así que
    // lleva el reloj local de ahora. todayFileSafe es la misma fecha sin
    // barras, para el nombre sugerido del archivo al descargar.
    const { date: todayFormatted, time: todayTime, fileSafe: todayFileSafe } = pdfDateTime();

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
                    signatureUrl={signatureUrl}
                    sealUrl={sealUrl}
                    date={todayFormatted}
                    time={todayTime}
                    vitals={{
                        weight: values?.clinical_data?.triage?.weight,
                        height: values?.clinical_data?.triage?.height,
                        oxygenSaturation: values?.clinical_data?.triage?.oxygen_saturation,
                        temperature: values?.clinical_data?.triage?.temperature,
                        bloodPressure: values?.clinical_data?.triage?.blood_pressure,
                        glucose: values?.clinical_data?.triage?.glucose,
                        // FC/FR no se capturan en el triage; si el doctor los llenó
                        // para la referencia, se muestran también acá.
                        heartRate: values?.referral?.heart_rate,
                        respiratoryRate: values?.referral?.respiratory_rate,
                    }}
                    icdCode={values?.clinical_data?.icd_diagnosis}
                    historial={values?.clinical_data?.evolution}
                    diagnosis={values?.clinical_data?.diagnosis}
                    diagnosisDescription={values?.clinical_data?.diagnosis_description}
                    tratamiento={values?.prescription?.indications}
                    medications={values?.prescription?.medications}
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

    // Botón "Generar receta": solo lee lo que el doctor ya cargó en la
    // tarjeta Receta y seguimiento (no guarda nada, a diferencia de
    // "Generar incapacidad"), así que también funciona en modo de solo
    // lectura para reimprimir la receta de una consulta ya atendida. Mismo
    // documento (RecetaDocument.jsx) que se descarga después desde el
    // expediente del paciente, para que sea el mismo PDF sin importar desde
    // dónde se genere.
    const handleGenerateReceta = async () => {
        const values = methods.getValues();
        const medications = (values?.prescription?.medications || []).filter((m) => m?.name?.trim());
        if (medications.length === 0) {
            showError(
                "Falta la receta",
                "Agrega al menos un medicamento en la sección Receta y seguimiento antes de generar el recetario."
            );
            return;
        }
        try {
            await openPdfInNewTab(
                <RecetaDocument
                    title={`Receta médica de ${patientFullName} ${todayFileSafe}`}
                    patientName={patientFullName}
                    dui={patient?.dui}
                    age={calculateAge(patient?.birth_date)}
                    doctorName={doctorFullName}
                    signatureUrl={signatureUrl}
                    sealUrl={sealUrl}
                    date={todayFormatted}
                    time={todayTime}
                    medications={medications}
                    instructions={values?.prescription?.indications}
                />
            );
        } catch (err) {
            showError("Error al generar el PDF", err?.message || "No se pudo generar el recetario.");
        }
    };

    // Botón "Generar referencia": arma la hoja de referencia con lo que el
    // doctor cargó en la tarjeta "Referencia" (referido a, motivo, dirección,
    // FC, FR) más lo que sale del resto de la consulta (PA, SPO2, examen físico,
    // impresión diagnóstica). La referencia es opcional, así que esos campos no
    // tienen "required" propio: se validan acá y se marcan en rojo, igual que en
    // "Vista previa e imprimir".
    const handleGenerateReferencia = async () => {
        const values = methods.getValues();
        const manualChecks = [
            ["referral.referred_to", "Indica a quién se refiere al paciente"],
            ["referral.reason", "Escribe el motivo de la referencia"],
            ["referral.heart_rate", "Falta la frecuencia cardíaca"],
            ["referral.respiratory_rate", "Falta la frecuencia respiratoria"],
        ];
        let missing = false;
        for (const [field, message] of manualChecks) {
            if (!String(getNested(values, field) ?? "").trim()) {
                methods.setError(field, { type: "manual", message });
                missing = true;
            }
        }
        const diagOk = await methods.trigger([...DIAGNOSIS_FIELDS, "clinical_data.triage.blood_pressure"]);
        if (missing || !diagOk) {
            showError(
                "Completa el destino, el motivo, la FC/FR y el diagnóstico (con la presión arterial) antes de generar la referencia."
            );
            return;
        }

        try {
            await openPdfInNewTab(
                <ReferenciaDocument
                    title={`Referencia de ${patientFullName} ${todayFileSafe}`}
                    patientName={patientFullName}
                    age={calculateAge(patient?.birth_date)}
                    patientPhone={patient?.phone}
                    referredDoctorAddress={values?.referral?.referred_doctor_address}
                    referredDoctorPhone={values?.referral?.referred_doctor_phone}
                    date={todayFormatted}
                    time={todayTime}
                    referredTo={values?.referral?.referred_to}
                    reason={values?.referral?.reason}
                    bloodPressure={values?.clinical_data?.triage?.blood_pressure}
                    heartRate={values?.referral?.heart_rate}
                    respiratoryRate={values?.referral?.respiratory_rate}
                    spo2={values?.clinical_data?.triage?.oxygen_saturation}
                    physicalExam={buildPhysicalExamText(values?.physical_exam)}
                    icdCode={values?.clinical_data?.icd_diagnosis}
                    diagnosis={values?.clinical_data?.diagnosis}
                    diagnosisDescription={values?.clinical_data?.diagnosis_description}
                    doctorName={doctorFullName}
                    signatureUrl={signatureUrl}
                    sealUrl={sealUrl}
                />
            );
        } catch (err) {
            showError(err?.message || "No se pudo generar la referencia.");
        }
    };

    // Botón "Generar orden de laboratorio": la orden es opcional y se llena en
    // una pantalla aparte. Peso y talla (Paso 2) van en la orden y salen de esta
    // consulta, así que se exigen antes de salir; si faltan, se marcan en rojo
    // igual que al intentar guardar. Se guarda un borrador del formulario para no
    // perder lo escrito al volver.
    const handleGenerateLabOrder = () => {
        if (!readOnly) {
            const values = methods.getValues();
            const missing = [];
            if (!String(values?.clinical_data?.triage?.weight ?? "").trim()) {
                methods.setError("clinical_data.triage.weight", {
                    type: "manual",
                    message: "El peso es necesario para la orden de laboratorio",
                });
                missing.push("el peso");
            }
            if (!String(values?.clinical_data?.triage?.height ?? "").trim()) {
                methods.setError("clinical_data.triage.height", {
                    type: "manual",
                    message: "La talla es necesaria para la orden de laboratorio",
                });
                missing.push("la talla");
            }
            if (missing.length > 0) {
                showError(`Completa ${missing.join(" y ")} en el triage (Paso 2) antes de generar la orden de laboratorio.`);
                return;
            }
            sessionStorage.setItem(draftKey(appointmentId), JSON.stringify({ values, ts: Date.now() }));
        }
        // Reenvía el mismo location.state con el que se llegó a esta consulta, para que
        // el botón de volver de LabOrderForm.jsx also sepa a dónde regresar.
        navigate(`/calendar/consultations/${appointmentId}/lab-order${readOnly ? "?mode=view" : ""}`, {
            state: location.state,
        });
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
                signatureUrl={signatureUrl}
                sealUrl={sealUrl}
                date={todayFormatted}
                time={todayTime}
            />
        );
    };

    // La enfermera solo puede escribir la nota si la consulta ya existe y no
    // se abrió en modo de solo lectura explícito. El resto del formulario
    // sigue en readOnly para ella (no tiene permiso de editar consultas).
    const canEditNurseNote = showNurseNote && hasExistingRecord && !forcedView;
    const nurseNoteHint = showNurseNote && !hasExistingRecord
        ? "Disponible cuando la consulta esté guardada."
        : "";

    // Guarda solo la nota de enfermería por su endpoint propio.
    const handleSaveNurseNote = async (text) => {
        if (savingNurseNote || !consultationId) return;
        setSavingNurseNote(true);
        try {
            const res = await apiClient(`/consultations/${consultationId}/nurse-note`, {
                method: "PATCH",
                body: { text },
            });
            setNurseNote(res?.data?.nurse_note || "");
            setNurseNoteAt(res?.data?.nurse_note_at || null);
            await showSuccess("Nota guardada", "La nota de enfermería quedó registrada.");
        } catch (err) {
            showError("Error al guardar", err?.message || "No se pudo guardar la nota de enfermería.");
        } finally {
            setSavingNurseNote(false);
        }
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
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0b66d6] mb-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {location.state?.fromRecords ? "Volver al expediente" : "Volver a consultas"}
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
                        <DiagnosisCard
                            readOnly={readOnly}
                            showNurseNote={showNurseNote}
                            nurseNote={nurseNote}
                            nurseNoteAt={nurseNoteAt}
                            canEditNurseNote={canEditNurseNote}
                            nurseNoteHint={nurseNoteHint}
                            onSaveNurseNote={handleSaveNurseNote}
                            savingNurseNote={savingNurseNote}
                        />
                        <ProceduresCard readOnly={readOnly} />

                        {canCreateTreatment && <TreatmentPlanCard readOnly={readOnly} activeTreatment={activeTreatment} />}

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
                            currentVerified={!!appointment?.patient_id?.clinical_history?.blood_type_verified}
                            onSaved={setBloodTypeOverride}
                            readOnly={readOnly || !canSaveBloodType}
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
                            onClose={goBack}
                            onPreview={handlePreview}
                            onGenerateIncapacidad={handleOpenIncapacidad}
                            onGenerateReceta={handleGenerateReceta}
                            onGenerateLabOrder={handleGenerateLabOrder}
                            onGenerateReferencia={handleGenerateReferencia}
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