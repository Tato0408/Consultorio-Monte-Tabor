// src/features/consultations/hooks/useConsultation.js
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

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
  const [defaultValues, setDefaultValues] = useState(emptyConsultation);
  const [consultationId, setConsultationId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const getPatientAntecedents = (clinicalHistory) => {
    if (!clinicalHistory) {
      return {
        hereditary: [],
        pathological: [],
        non_pathological: [],
        socio_ecological: [],
      };
    }

    // Hereditary: mapear relationship -> relative
    const hereditary = Array.isArray(clinicalHistory.hereditary)
      ? clinicalHistory.hereditary.map((item) => ({
          relative: item.relationship || item.relative || "",
          condition: item.condition || "",
          _id: item._id,
        }))
      : [];

    // Pathological: mapear diagnosis -> type
    const pathological = Array.isArray(clinicalHistory.pathological)
      ? clinicalHistory.pathological.map((item) => ({
          disease: item.disease || "",
          type: item.type || item.diagnosis || "",
          _id: item._id,
        }))
      : [];

    // non_pathological: puede ser string o array
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

    // socio_ecological: puede ser string o array
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

  const fetchConsultation = useCallback(async () => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Obtener la cita (appointment)
      const apptRes = await apiClient(`/appointments/${appointmentId}`);
      console.log(" Appointment response:", apptRes);
      setAppointment(apptRes);

      // 2. Extraer los antecedentes del paciente (del appointment)
      const clinicalHistory = apptRes.patient_id?.clinical_history || {};
      const patientAntecedents = getPatientAntecedents(clinicalHistory);
      console.log(" Patient antecedents:", patientAntecedents);

      // 3. Obtener la consulta (si existe)
      try {
        const consultRes = await apiClient(
          `/consultations/by-appointment/${appointmentId}`
        );
        console.log(" Consultation response:", consultRes);

        if (consultRes && Object.keys(consultRes).length > 0) {
          // Obtener los antecedentes de la consulta
          const consultationAntecedents = consultRes.antecedents || {};

          // si la consulta tiene antecedentes, usarlos; si no, usar los del paciente
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

          // Asegurar que procedure sea un array
          const procedureData = Array.isArray(consultRes.procedure)
            ? consultRes.procedure
            : [];

          const consultationData = {
            ...consultRes,
            antecedents: combinedAntecedents,
            procedure: procedureData,
          };

          setDefaultValues((prev) => ({ ...prev, ...consultationData }));
          setConsultationId(consultRes._id);
        } else {
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
        }
      } catch (consultErr) {
        // Si es 404, no hay consulta - CREAR NUEVA
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
      const status = err.status || err.response?.status;
      if (status !== 404 && !err.message?.includes("404")) {
        setError(err.message || "Error al cargar los datos");
      }
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchConsultation();
  }, [fetchConsultation]);

  // Guardar la consulta
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

        const payload = {
          appointment_id: appointmentId,
          patient_id: patientId,
          ...formValues,
        };

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

  return {
    appointment,
    defaultValues,
    save,
    isLoading,
    isSaving,
    error,
    hasExistingRecord: !!consultationId,
  };
}

export default useConsultation;
