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

        if (consultRes && Object.keys(consultRes).length > 0) {
          // Los antecedentes siempre se precargan desde el historial actual
          // del paciente, no desde la copia guardada en esta consulta: al
          // guardar, el backend los escribe en el historial del paciente, y
          // partir de la copia vieja revertía lo que se agregó después desde
          // el expediente, el portal o la app móvil.
          const combinedAntecedents = patientAntecedents;

          // Valida que procedure sea un array.
          const procedureData = Array.isArray(consultRes.procedure)
            ? consultRes.procedure
            : [];

          // Agrupa los datos normalizados de la consulta para precargar
          // los valores por defecto del formulario.
          const consultationData = {
            ...consultRes,
            antecedents: combinedAntecedents,
            procedure: procedureData,
          };

          setDefaultValues((prev) => ({ ...prev, ...consultationData }));
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
      // maneja arriba, en su propio try). Un 404 o 403 sobre la cita ahora
      // significa que pertenece a un paciente o doctor inactivo y ya no debe
      // abrirse: se trata como error de carga para redirigir fuera de la
      // pantalla, igual que una cita eliminada.
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

        // Arma el payload agregando los ids de la cita y el paciente a
        // los datos del formulario.
        const payload = {
          appointment_id: appointmentId,
          patient_id: patientId,
          ...formValues,
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
          // Marca la cita como completada. Va en su PROPIO try/catch: si esto falla
          // DESPUÉS de que el PUT/POST de arriba ya tuvo éxito, los datos clínicos SÍ
          // quedaron guardados — antes, ambos pasos compartían el mismo catch de abajo y
          // ConsultationForm.jsx mostraba el mismo "No se pudo guardar la consulta" sin
          // importar cuál de los dos pasos había fallado, dándole al doctor la impresión
          // de que nada se guardó (y el riesgo de reintentar innecesariamente) cuando en
          // realidad solo faltó marcarla como completada.
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
