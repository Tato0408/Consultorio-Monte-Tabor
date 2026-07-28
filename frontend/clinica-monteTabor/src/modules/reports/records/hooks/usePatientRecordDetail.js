import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../../lib/apiClient";
import { formatFecha } from "./useRecords";

const getDoctorName = (doctor) => {
  if (!doctor) return "Sin asignar";
  return `${doctor.name || ""} ${doctor.last_name || ""}`.trim() || "Sin asignar";
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
};

const getLatestByDate = (items = [], dateField) =>
  items.reduce((latest, item) => {
    if (!item[dateField]) return latest;
    const date = new Date(item[dateField]);
    if (!latest || date > new Date(latest[dateField])) return item;
    return latest;
  }, null);

// Arma, a partir de las consultas/citas pendientes/incapacidades reales de un
// paciente, el mismo shape de campos que antes vivía quemado en
// MOCK_DEFAULTS (useRecords.js): consultas, recetas, laboratorios,
// referencias, incapacidades, notasEvolucion e impresionDiagnostica.
const buildExtra = (consultations, pendingAppointments, sickLeaves, patientName) => {
  const atendidas = consultations.map((c, i) => ({
    id: c._id || `c-${i}`,
    // El id de la Consulta no sirve para navegar al formulario (que siempre
    // se monta por id de Cita); se guarda aparte para no confundirlo con `id`.
    appointmentId: c.appointment_id?._id || c.appointment_id || null,
    _fecha: c.date,
    hora: c.appointment_id?.start_time || "—",
    paciente: patientName || "—",
    medico: getDoctorName(c.appointment_id?.doctor_id),
    estado: "atendido",
  }));

  const enEspera = pendingAppointments.map((a, i) => ({
    id: a._id || `a-${i}`,
    appointmentId: a._id || null,
    _fecha: a.date,
    hora: a.start_time || "—",
    paciente: patientName || "—",
    medico: getDoctorName(a.doctor_id),
    estado: "en_espera",
  }));

  const consultas = [...atendidas, ...enEspera].sort(
    (a, b) => new Date(b._fecha || 0) - new Date(a._fecha || 0)
  );

  const recetas = consultations.flatMap((c) =>
    (c.prescription?.medications || []).map((m) => ({
      nombre: m.name || "—",
      fecha: formatFecha(c.date) || "—",
      doctor: getDoctorName(c.appointment_id?.doctor_id),
    }))
  );

  const laboratorios = consultations.flatMap((c) =>
    (c.prescription?.lab_orders || []).map((l) => ({
      nombre: l.test_name || "—",
      fecha: formatFecha(c.date) || "—",
      // El modelo de prescripción no registra si la orden ya se completó.
      estado: "Ordenado",
    }))
  );

  const referencias = consultations
    .filter((c) => c.referral?.reason)
    .map((c) => ({
      nombre: c.referral.reason,
      fecha: formatFecha(c.referral.referred_date || c.date) || "—",
      estado: c.referral.status || "Pendiente",
    }));

  const incapacidades = sickLeaves.map((s) => {
    const days = daysBetween(s.start_date, s.end_date);
    const suffix = days ? ` (${days} día${days > 1 ? "s" : ""})` : "";
    return {
      nombre: `${s.diagnosis || "Incapacidad"}${suffix}`,
      fecha: formatFecha(s.start_date) || "—",
      estado: s.status || "Activa",
    };
  });

  const extra = {
    consultas,
    recetas,
    laboratorios,
    referencias,
    incapacidades,
    // La lista de citas pendientes ya viene ordenada ascendente por fecha
    // desde el backend, así que la primera es la próxima cita del paciente.
    nextPendingAppointmentId: pendingAppointments[0]?._id || null,
  };

  const latestConsultation = getLatestByDate(consultations, "date");
  if (latestConsultation) {
    extra.notasEvolucion = {
      texto:
        latestConsultation.clinical_data?.evolution ||
        "El paciente no tiene notas de evolución registradas.",
      actualizado: formatFecha(latestConsultation.date) || "—",
    };
    extra.impresionDiagnostica = {
      codigo: latestConsultation.clinical_data?.icd_diagnosis || "CIE",
      descripcion:
        latestConsultation.clinical_data?.diagnosis_description ||
        latestConsultation.clinical_data?.diagnosis ||
        "Sin diagnóstico registrado",
      tipo: "Diagnóstico principal",
    };
    extra.doctorOverride = { nombre: getDoctorName(latestConsultation.appointment_id?.doctor_id) };
    extra.ultimaVisitaOverride = {
      fecha: formatFecha(latestConsultation.date) || "—",
      hora: latestConsultation.appointment_id?.start_time || "—",
      _fecha: latestConsultation.date,
    };
  }

  return extra;
};

// Trae, para un paciente puntual, todo lo que su expediente necesita y que
// no vive en el documento de /patients: consultas reales, citas aún no
// atendidas, y sus incapacidades. Se dispara solo cuando cambia el
// paciente abierto, no en cada cambio de pestaña.
const usePatientRecordDetail = (patientId, patientName) => {
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExtra = useCallback(async () => {
    if (!patientId) {
      setExtra(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [consultations, appointmentsRes, sickLeaves] = await Promise.all([
        apiClient("/consultations", { params: { patient_id: patientId } }),
        apiClient("/appointments", {
          params: { patient_id: patientId, status: "pending,scheduled,confirmed", limit: 50 },
        }),
        apiClient("/sick-leaves", { params: { patient_id: patientId } }),
      ]);

      setExtra(
        buildExtra(
          Array.isArray(consultations) ? consultations : [],
          Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [],
          Array.isArray(sickLeaves) ? sickLeaves : [],
          patientName
        )
      );
    } catch (err) {
      setError(err.message || "Error al cargar la información clínica del paciente");
    } finally {
      setLoading(false);
    }
  }, [patientId, patientName]);

  useEffect(() => {
    fetchExtra();
  }, [fetchExtra]);

  return { extra, loading, error, refetch: fetchExtra };
};

export default usePatientRecordDetail;
