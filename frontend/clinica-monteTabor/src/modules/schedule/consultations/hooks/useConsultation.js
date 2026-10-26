import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Estructura base con valores vacíos, usada para inicializar o resetear
// el formulario de consulta médica.
const emptyConsultation = {
  clinical_data: {
    triage: {
      blood_pressure: "",
      glucose: "",
      weight: "",
      height: "",
      temperature: "",
      oxygen_saturation: "",
    },
    evolution: "",
    icd_diagnosis: "",
    diagnosis: "",
    diagnosis_description: "",
  },
  physical_exam: {
    general: "",
    skin: "",
    cardiopulmonary: "",
    abdomen: "",
    neurological: "",
    musculoskeletal: "",
    notes: "",
  },
  procedure: [],
  prescription: {
    medications: [],
    indications: "",
    next_appointment_suggested: "",
  },
  referral: {
    reason: "",
    referred_to: "",
    referred_date: "",
    referred_doctor_address: "",
    referred_doctor_phone: "",
    heart_rate: "",
    respiratory_rate: "",
  },
  antecedents: {
    hereditary: [],
    pathological: [],
    non_pathological: [],
    socio_ecological: [],
  },
  follow_up_date: "",
  // Plan de tratamiento (TreatmentPlanCard). create inicia un tratamiento
  // nuevo desde esta consulta; link agrega la evolución de esta consulta
  // al tratamiento que el paciente ya tenga abierto.
  treatment_plan: {
    create: false,
    link: true,
    objective: "",
    plan_description: "",
    total_sessions: "",
    estimated_end_date: "",
  },
};

// Convierte una fecha guardada (ISO) al formato AAAA MM DD con guiones que
// exige un input de tipo date. Devuelve texto vacío si no hay fecha válida.
const to_input_date = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

/*
 * Arma los valores del formulario a partir de una consulta ya guardada.
 * Recibe la respuesta de /consultations/by-appointment y los antecedentes
 * actuales del paciente, y devuelve un objeto con la misma forma que
 * emptyConsultation. Las indicaciones y la próxima cita sugerida vienen de
 * la receta (prescription), con los nombres que usa PrescriptionCard. Las
 * fechas se pasan al formato del input date para que se muestren y se
 * reenvíen sin perderse. No incluye patient_id ni appointment_id, que llegan
 * poblados y los agrega save() como ids.
 */
const build_form_values = (consultation, patient_antecedents) => {
  const clinical_data = consultation.clinical_data || {};
  const physical_exam = consultation.physical_exam || {};
  const referral = consultation.referral || {};
  const prescription = consultation.prescription || {};

  return {
    ...emptyConsultation,
    clinical_data: {
      ...emptyConsultation.clinical_data,
      ...clinical_data,
      triage: { ...emptyConsultation.clinical_data.triage, ...(clinical_data.triage || {}) },
    },
    // PhysicalExamCard guarda el examen neurológico con la clave
    // "neorulogical", las consultas antiguas pueden traerlo como
    // "neurological".
    physical_exam: {
      ...emptyConsultation.physical_exam,
      ...physical_exam,
      neorulogical: physical_exam.neorulogical ?? physical_exam.neurological ?? "",
    },
    procedure: Array.isArray(consultation.procedure) ? consultation.procedure : [],
    prescription: {
      medications: Array.isArray(prescription.medications) ? prescription.medications : [],
      indications: prescription.post_operative_instructions || prescription.indications || "",
      next_appointment_suggested: to_input_date(prescription.next_appointment_suggested),
    },
    referral: {
      ...emptyConsultation.referral,
      ...referral,
      referred_date: to_input_date(referral.referred_date),
    },
    // Los antecedentes salen del historial actual del paciente y no de la
    // copia de esta consulta, porque el backend los escribe en el historial
    // y pudieron cambiar después desde el expediente, el portal o la app.
    antecedents: patient_antecedents,
    follow_up_date: to_input_date(consultation.follow_up_date),
    nurse_note: consultation.nurse_note || "",
    nurse_note_at: consultation.nurse_note_at || null,
  };
};

function useConsultation(appointmentId) {
  // Valores actuales del formulario, id de la consulta ya guardada (si
  // existe) y datos completos de la cita asociada.
  const [defaultValues, setDefaultValues] = useState(emptyConsultation);
  const [consultationId, setConsultationId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  // Tratamiento activo o en pausa del paciente de la cita, si tiene uno.
  // Lo consume TreatmentPlanCard para ofrecer registrar la evolución en
  // ese tratamiento en vez de crear uno nuevo.
  const [activeTreatment, setActiveTreatment] = useState(null);

  // Normaliza el historial clínico del paciente y devuelve sus
  // antecedentes en el formato que espera el formulario de consulta.
  const getPatientAntecedents = (clinicalHistory) => {
    if (!clinicalHistory) {
      return {
        hereditary: [],
        pathological: [],
        non_pathological: [],
        socio_ecological: [],
      };
    }

    // Hereditarios con el mismo formato que el expediente y la app móvil
    // ({ relationship, condition, type }). El formulario edita parentesco
    // (relative) y condición; type viaja oculto en la fila para que el
    // backend lo conserve al guardar.
    const hereditary = Array.isArray(clinicalHistory.hereditary)
      ? clinicalHistory.hereditary.map((item) => ({
          relative: item.relationship || item.relative || "",
          condition: item.condition || "",
          type: item.type || "",
          _id: item._id,
        }))
      : [];

    // Patológicos con el formato { disease, diagnosis, type }. El
    // formulario edita enfermedad y tipo; diagnosis viaja oculto en la fila
    // para que el backend lo conserve al guardar.
    const pathological = Array.isArray(clinicalHistory.pathological)
      ? clinicalHistory.pathological.map((item) => ({
          disease: item.disease || "",
          type: item.type || "",
          diagnosis: item.diagnosis || "",
          _id: item._id,
        }))
      : [];

    // No patológicos y socioecológicos se guardan en la base como un solo
    // texto (non_pathological y ecologycal_social), con una línea por
    // antecedente. Se separa por líneas para mostrar una fila por cada uno,
    // y el backend las vuelve a unir igual al guardar.
    const text_to_rows = (value) => {
      if (Array.isArray(value)) {
        return value.map((item) => ({ description: typeof item === "string" ? item : item.description || "" }));
      }
      return String(value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({ description }));
    };
    const non_pathological = text_to_rows(clinicalHistory.non_pathological);
    const socio_ecological = text_to_rows(clinicalHistory.ecologycal_social);

    return {
      hereditary,
      pathological,
      non_pathological,
      socio_ecological,
    };
  };

  // Trae los datos de la cita y de la consulta médica relacionada.
  const fetchConsultation = useCallback(async () => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtiene los datos de la cita a partir de su id.
      const apptRes = await apiClient(`/appointments/${appointmentId}`);
      setAppointment(apptRes);

      // Consulta si el paciente ya tiene un tratamiento abierto, para que
      // el formulario ofrezca continuarlo en vez de crear otro. Un fallo
      // acá no corta la carga de la consulta.
      const patientIdForTreatment = apptRes.patient_id?._id || apptRes.patient_id;
      if (patientIdForTreatment) {
        try {
          const treatmentRes = await apiClient("/treatments/active", {
            params: { patient_id: patientIdForTreatment },
          });
          setActiveTreatment(treatmentRes?.treatment || null);
        } catch {
          setActiveTreatment(null);
        }
      }

      // Extrae de forma segura los antecedentes clínicos del paciente
      // asociado a la cita.
      const clinicalHistory = apptRes.patient_id?.clinical_history || {};
      const patientAntecedents = getPatientAntecedents(clinicalHistory);

      try {
        // Busca una consulta médica ya guardada para esta cita.
        const consultRes = await apiClient(
          `/consultations/by-appointment/${appointmentId}`
        );

        if (consultRes && consultRes._id) {
          setDefaultValues(build_form_values(consultRes, patientAntecedents));
          setConsultationId(consultRes._id);
        } else {
          // No hay consulta guardada todavía. Si la cita ya trae uno o más
          // procedimientos preasignados (procedure_id es un array: la cita puede
          // combinar varios), los usa como valor inicial, una fila por cada uno.
          const procedureData = (apptRes.procedure_id || []).map((p) => ({
            procedure_id: typeof p === "object" ? p._id : p,
            doctor_id: apptRes.doctor_id?._id || apptRes.doctor_id || "",
            notes: "",
            material_used: [],
          }));

          // Arma la estructura inicial de una consulta nueva, usando
          // los antecedentes del historial del paciente.
          const newConsultation = {
            ...emptyConsultation,
            antecedents: patientAntecedents,
            procedure: procedureData,
          };

          setDefaultValues(newConsultation);
        }
      } catch (consultErr) {
        // Un 404 significa que todavía no existe consulta para esta
        // cita, así que se inicializa un registro nuevo en blanco.
        if (consultErr.status === 404 || consultErr.response?.status === 404) {
          // Misma regla que arriba: una fila por cada procedimiento preasignado.
          const procedureData = (apptRes.procedure_id || []).map((p) => ({
            procedure_id: typeof p === "object" ? p._id : p,
            doctor_id: apptRes.doctor_id?._id || apptRes.doctor_id || "",
            notes: "",
            material_used: [],
          }));

          const newConsultation = {
            ...emptyConsultation,
            antecedents: patientAntecedents,
            procedure: procedureData,
          };

          setDefaultValues(newConsultation);
        } else {
          setDefaultValues(emptyConsultation);
        }
      }
    } catch (err) {
      // Aquí solo caen los fallos al traer la cita (el 404 de la consulta se
      // maneja arriba, en su propio try). Un 404 o 403 sobre la cita
      // significa que no existe o que pertenece a un paciente o doctor
      // inactivo: se trata como error de carga para salir de la pantalla.
      const status = err.status || err.response?.status;
      if (status === 404 || status === 403) {
        setError("Esta cita ya no está disponible.");
      } else {
        setError(err.message || "Error al cargar los datos");
      }
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  // Ejecuta la carga de datos automáticamente cada vez que cambia el
  // id de la cita.
  useEffect(() => {
    fetchConsultation();
  }, [fetchConsultation]);

  // Envía los datos del formulario para crear o actualizar el registro
  // de la consulta médica.
  const save = useCallback(
    async (formValues, { markCompleted = true } = {}) => {
      if (!appointmentId) {
        throw new Error("No appointment ID provided");
      }

      setIsSaving(true);
      setError(null);

      try {
        const patientId =
          appointment?.patient_id?._id || appointment?.patient_id;

        // Arma el payload con los datos del formulario y los ids de la cita
        // y del paciente, que van al final para que ningún valor del
        // formulario los reemplace.
        const payload = {
          ...formValues,
          appointment_id: appointmentId,
          patient_id: patientId,
        };

        // Usa PUT si ya existe una consulta guardada para esta cita, o
        // POST para crear una nueva. Si el POST responde 409 (la cita ya
        // tiene consulta, por ejemplo guardada desde otra pestaña), se
        // actualiza esa misma consulta en vez de crear un duplicado.
        const put = (id) => apiClient(`/consultations/${id}`, { method: "PUT", body: payload });
        let savedId = consultationId;
        if (consultationId) {
          await put(consultationId);
        } else {
          try {
            const created = await apiClient("/consultations", { method: "POST", body: payload });
            savedId = created?._id || null;
          } catch (postErr) {
            const existingId = postErr.status === 409 ? postErr.data?.consultation_id : null;
            if (!existingId) throw postErr;
            await put(existingId);
            savedId = existingId;
          }
        }

        if (savedId) {
          setConsultationId(savedId);
        }

        if (markCompleted) {
          // Marca la cita como completada en un try aparte. Si solo falla este
          // paso, los datos clínicos ya quedaron guardados: el error lleva
          // consultationSaved para que ConsultationForm.jsx avise de un
          // guardado parcial en lugar de un fallo total.
          try {
            await apiClient(`/appointments/${appointmentId}/status`, {
              method: "PATCH",
              body: { status: "completed" },
            });
          } catch (statusErr) {
            const err = new Error(
              statusErr.message || "La consulta se guardó, pero no se pudo marcar la cita como completada. Inténtalo de nuevo."
            );
            err.consultationSaved = true;
            throw err;
          }
        }

        return { _id: savedId };
      } catch (err) {
        setError(err.message || "Error al guardar la consulta");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [appointmentId, appointment, consultationId]
  );

  // Expone los datos de la cita y la consulta, los estados de carga y
  // guardado, y las funciones para el componente que consume el hook.
  return {
    appointment,
    defaultValues,
    save,
    isLoading,
    isSaving,
    error,
    consultationId,
    activeTreatment,
    hasExistingRecord: !!consultationId,
  };
}

export default useConsultation;
