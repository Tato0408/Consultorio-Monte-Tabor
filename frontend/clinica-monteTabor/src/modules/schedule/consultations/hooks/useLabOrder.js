import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// Lee el borrador de la consulta que ConsultationForm dejó en sessionStorage
// antes de navegar acá. De ahí salen el peso y la talla que van en la orden
// (los captura el triage, no esta pantalla).
const readConsultationDraft = (appointmentId) => {
    try {
        const raw = sessionStorage.getItem(`consultation-draft:${appointmentId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.values || Date.now() - (parsed.ts || 0) > 2 * 60 * 60 * 1000) return null;
        return parsed.values;
    } catch {
        return null;
    }
};

// Carga la cita (para los datos del paciente y del médico) y la orden de
// laboratorio ya guardada de esa cita, y expone save().
function useLabOrder(appointmentId) {
    const [appointment, setAppointment] = useState(null);
    const [labOrder, setLabOrder] = useState(null);
    const [triageWeight, setTriageWeight] = useState("");
    const [triageHeight, setTriageHeight] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!appointmentId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [apptRes, labOrderRes] = await Promise.all([
                apiClient(`/appointments/${appointmentId}`),
                apiClient(`/lab-orders/by-appointment/${appointmentId}`).catch(() => null),
            ]);
            setAppointment(apptRes);
            setLabOrder(labOrderRes || null);

            // Peso y talla: primero del borrador de consulta en curso; si no hay,
            // de la consulta ya guardada; si tampoco, de lo que quedó en la orden.
            const draft = readConsultationDraft(appointmentId);
            let weight = draft?.clinical_data?.triage?.weight ?? "";
            let height = draft?.clinical_data?.triage?.height ?? "";

            if (weight === "" || height === "") {
                const consult = await apiClient(`/consultations/by-appointment/${appointmentId}`).catch(() => null);
                const savedTriage = consult?.clinical_data?.triage || {};
                if (weight === "") weight = savedTriage.weight ?? "";
                if (height === "") height = savedTriage.height ?? "";
            }
            if (weight === "" && labOrderRes?.weight != null) weight = String(labOrderRes.weight);
            if (height === "" && labOrderRes?.height != null) height = String(labOrderRes.height);

            setTriageWeight(weight === null ? "" : String(weight));
            setTriageHeight(height === null ? "" : String(height));
        } catch (err) {
            setError(err?.message || "No se pudo cargar la orden de laboratorio.");
        } finally {
            setIsLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const save = useCallback(
        async (values) => {
            setIsSaving(true);
            setError(null);
            try {
                const patientId = appointment?.patient_id?._id || appointment?.patient_id;
                const response = await apiClient("/lab-orders", {
                    method: "POST",
                    body: {
                        appointment_id: appointmentId,
                        patient_id: patientId,
                        tests: values.tests,
                        pregnancy: values.pregnancy,
                        antibiotic_treatment: values.antibiotic_treatment,
                        other_tests: values.other_tests,
                        weight: triageWeight,
                        height: triageHeight,
                    },
                });
                setLabOrder(response);
                return response;
            } catch (err) {
                setError(err?.message || "No se pudo guardar la orden de laboratorio.");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [appointmentId, appointment, triageWeight, triageHeight]
    );

    return {
        appointment,
        labOrder,
        triageWeight,
        triageHeight,
        save,
        isLoading,
        isSaving,
        error,
    };
}

export default useLabOrder;
