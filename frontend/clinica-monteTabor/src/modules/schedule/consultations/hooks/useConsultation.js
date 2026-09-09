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
    address: "",
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

    // Mapea los antecedentes hereditarios, aceptando tanto el campo
    // relationship como relative para el mismo dato.
    const hereditary = Array.isArray(clinicalHistory.hereditary)
      ? clinicalHistory.hereditary.map((item) => ({
          relative: item.relationship || item.relative || "",
          condition: item.condition || "",
          _id: item._id,
        }))
      : [];

    // Mapea los antecedentes patológicos, aceptando tanto el campo
    // type como diagnosis para el mismo dato.
    const pathological = Array.isArray(clinicalHistory.pathological)
      ? clinicalHistory.pathological.map((item) => ({
          disease: item.disease || "",
          type: item.type || item.diagnosis || "",
          _id: item._id,
        }))
      : [];

    // Normaliza los antecedentes no patológicos, que pueden venir como
    // arreglo de objetos o como un string suelto.
    let non_pathological = [];
    if (Array.isArray(clinicalHistory.non_pathological)) {
      non_pathological = clinicalHistory.non_pathological.map((item) => ({
        description: typeof item === "string" ? item : item.description || "",
      }));
    } else if (
      typeof clinicalHistory.non_pathological === "string" &&
      clinicalHistory.non_pathological
    ) {
      non_pathological = [{ description: clinicalHistory.non_pathological }];
    }

    // Normaliza los antecedentes socioecológicos, que pueden venir como
    // arreglo de objetos o como un string suelto.
    let socio_ecological = [];
    if (Array.isArray(clinicalHistory.socio_ecological)) {
      socio_ecological = clinicalHistory.socio_ecological.map((item) => ({
        description: typeof item === "string" ? item : item.description || "",
      }));
    } else if (
      typeof clinicalHistory.socio_ecological === "string" &&
      clinicalHistory.socio_ecological
    ) {
      socio_ecological = [{ description: clinicalHistory.socio_ecological }];
    }

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
      console.log(" Appointment response:", apptRes);
      setAppointment(apptRes);

      // Extrae de forma segura los antecedentes clínicos del paciente
      // asociado a la cita.
      const clinicalHistory = apptRes.patient_id?.clinical_history || {};
      const patientAntecedents = getPatientAntecedents(clinicalHistory);
      console.log(" Patient antecedents:", patientAntecedents);

      try {
        // Busca una consulta médica ya guardada para esta cita.
        const consultRes = await apiClient(
          `/consultations/by-appointment/${appointmentId}`
        );
        console.log(" Consultation response:", consultRes);

        if (consultRes && Object.keys(consultRes).length > 0) {
          const consultationAntecedents = consultRes.antecedents || {};

          // Usa los antecedentes de la consulta cuando existen, y si
          // no, recurre a los del historial del paciente.
          const combinedAntecedents = {
            hereditary:
              consultationAntecedents.hereditary?.length > 0
                ? consultationAntecedents.hereditary
                : patientAntecedents.hereditary,
            pathological:
              consultationAntecedents.pathological?.length > 0
                ? consultationAntecedents.pathological
                : patientAntecedents.pathological,
            non_pathological:
              consultationAntecedents.non_pathological?.length > 0
                ? consultationAntecedents.non_pathological
                : patientAntecedents.non_pathological,
            socio_ecological:
              consultationAntecedents.socio_ecological?.length > 0
                ? consultationAntecedents.socio_ecological
                : patientAntecedents.socio_ecological,
          };

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
          // No hay consulta guardada todavía. Si la cita ya trae un
          // procedimiento preasignado, lo usa como valor inicial.
          let procedureData = [];
          if (apptRes.procedure_id) {
            procedureData = [
              {
                procedure_id:
                  typeof apptRes.procedure_id === "object"
                    ? apptRes.procedure_id._id
                    : apptRes.procedure_id,
                doctor_id: apptRes.doctor_id?._id || apptRes.doctor_id || "",
                notes: "",
                material_used: [],
              },
            ];
          }

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
          let procedureData = [];
          if (apptRes.procedure_id) {
            procedureData = [
              {
                procedure_id:
                  typeof apptRes.procedure_id === "object"
                    ? apptRes.procedure_id._id
                    : apptRes.procedure_id,
                doctor_id: apptRes.doctor_id?._id || apptRes.doctor_id || "",
                notes: "",
                material_used: [],
              },
            ];
          }

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
        // POST para crear una nueva.
        const response = consultationId
          ? await apiClient(`/consultations/${consultationId}`, {
              method: "PUT",
              body: payload,
            })
          : await apiClient("/consultations", {
              method: "POST",
              body: payload,
            });

        if (response?._id) {
          setConsultationId(response._id);
        }

        if (markCompleted) {
          // Marca la cita como completada.
          await apiClient(`/appointments/${appointmentId}/status`, {
            method: "PATCH",
            body: { status: "completed" },
          });
        }

        return response;
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
    hasExistingRecord: !!consultationId,
  };
}

export default useConsultation;
