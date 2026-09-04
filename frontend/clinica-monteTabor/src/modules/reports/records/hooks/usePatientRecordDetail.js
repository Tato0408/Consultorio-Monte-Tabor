import { useState, useEffect, useCallback } from "react";
import apiClient from "../../../../lib/apiClient";
import { formatFecha } from "./useRecords";

// nurse: procedimiento sin doctor (requires_doctor false), la enfermera asignada es quien
// atendió en su lugar.
const getDoctorName = (doctor, nurse) => {
  if (doctor) return `${doctor.name || ""} ${doctor.last_name || ""}`.trim() || "Sin asignar";
  if (nurse) return `${nurse.name || ""} ${nurse.last_name || ""}`.trim() || "Sin asignar";
  return "Sin asignar";
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
};

// Vigente mientras la fecha de finalización no haya pasado (o no
// exista, ej. registros antiguos sin end_date, que se asumen
// vigentes por no tener forma de saber lo contrario).
const isSickLeaveVigente = (endDate) => {
  if (!endDate) return true;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
};

const getLatestByDate = (items = [], dateField) =>
  items.reduce((latest, item) => {
    if (!item[dateField]) return latest;
    const date = new Date(item[dateField]);
    if (!latest || date > new Date(latest[dateField])) return item;
    return latest;
  }, null);

// Arma, a partir de las consultas, las citas pendientes y las
// incapacidades reales de un paciente, el mismo conjunto de campos que
// usa el expediente: consultas, recetas, laboratorios, referencias,
// incapacidades, notasEvolucion e impresionDiagnostica.
const buildExtra = (consultations, pendingAppointments, sickLeaves, labOrders, patientName) => {
  const atendidas = consultations.map((c, i) => ({
    id: c._id || `c-${i}`,
    // El id de la consulta no sirve para navegar al formulario, que siempre
    // se monta con el id de la cita. Se guarda aparte para no confundirlo
    // con el campo id.
    appointmentId: c.appointment_id?._id || c.appointment_id || null,
    _fecha: c.date,
    hora: c.appointment_id?.start_time && c.appointment_id?.end_time
      ? `${c.appointment_id.start_time} - ${c.appointment_id.end_time}`
      : c.appointment_id?.start_time || "—",
    paciente: patientName || "—",
    medico: getDoctorName(c.appointment_id?.doctor_id, c.appointment_id?.nurse_id),
    estado: "atendido",
  }));

  const enEspera = pendingAppointments.map((a, i) => ({
    id: a._id || `a-${i}`,
    appointmentId: a._id || null,
    _fecha: a.date,
    hora: a.start_time && a.end_time ? `${a.start_time} - ${a.end_time}` : a.start_time || "—",
    paciente: patientName || "—",
    medico: getDoctorName(a.doctor_id, a.nurse_id),
    estado: "en_espera",
  }));

  const consultas = [...atendidas, ...enEspera].sort(
    (a, b) => new Date(b._fecha || 0) - new Date(a._fecha || 0)
  );

  // Recetas: un documento por consulta (el mismo PDF que se genera al
  // finalizarla, ver RecetaDocument.jsx), no uno por medicamento. Solo se
  // listan las consultas que sí tienen receta emitida.
  const recetas = consultations
    .filter((c) => c.prescription?._id)
    .map((c) => {
      const meds = c.prescription.medications || [];
      const nombre =
        meds.map((m) => m.name).filter(Boolean).join(", ") || "Sin medicamentos registrados";
      return {
        id: c.prescription._id,
        nombre,
        fecha: formatFecha(c.prescription.issued_at || c.date) || "—",
        doctor: getDoctorName(c.appointment_id?.doctor_id, c.appointment_id?.nurse_id),
        // Campos crudos para el modal de editar y para regenerar el PDF.
        medicationsRaw: meds,
        instructionsRaw: c.prescription.post_operative_instructions || "",
        issuedAtRaw: c.prescription.issued_at || c.date,
        doctorId: c.appointment_id?.doctor_id?._id ? String(c.appointment_id.doctor_id._id) : null,
        nurseId: c.appointment_id?.nurse_id?._id ? String(c.appointment_id.nurse_id._id) : null,
        doctorName: getDoctorName(c.appointment_id?.doctor_id, c.appointment_id?.nurse_id),
      };
    })
    .sort((a, b) => new Date(b.issuedAtRaw || 0) - new Date(a.issuedAtRaw || 0));

  // Órdenes de laboratorio: son los documentos que el doctor genera en la
  // pantalla de "Orden de laboratorio" y que quedan enlazados a la consulta al
  // finalizarla. Se llevan crudas para poder regenerar el PDF desde ResumeTab.
  const laboratorios = (labOrders || []).map((o) => {
    const count = Array.isArray(o.tests) ? o.tests.length : 0;
    return {
      id: o._id,
      nombre: count === 1 ? "1 examen solicitado" : `${count} exámenes solicitados`,
      fecha: formatFecha(o.issued_at || o.createdAt) || "—",
      estado: "Generada",
      doctorName: getDoctorName(
        o.consultation_id?.appointment_id?.doctor_id,
        o.consultation_id?.appointment_id?.nurse_id
      ),
      labOrder: o,
    };
  });

  const referencias = consultations
    .filter((c) => c.referral?.reason)
    .map((c) => ({
      id: String(c._id),
      // La referencia vive embebida en la consulta (no tiene colección
      // propia): editarla/eliminarla es un PUT/DELETE contra
      // /consultations/:id/referral usando este mismo id.
      consultationId: String(c._id),
      nombre: c.referral.reason,
      fecha: formatFecha(c.referral.referred_date || c.date) || "—",
      estado: c.referral.status || "Pendiente",
      // Campos crudos para el modal de editar.
      reasonRaw: c.referral.reason || "",
      referredToRaw: c.referral.referred_to || "",
      referredDateRaw: c.referral.referred_date || c.date,
      statusRaw: c.referral.status || "Pendiente",
      doctorId: c.appointment_id?.doctor_id?._id ? String(c.appointment_id.doctor_id._id) : null,
      nurseId: c.appointment_id?.nurse_id?._id ? String(c.appointment_id.nurse_id._id) : null,
      doctorName: getDoctorName(c.appointment_id?.doctor_id, c.appointment_id?.nurse_id),
    }));

  const incapacidades = sickLeaves.map((s) => {
    const days = daysBetween(s.start_date, s.end_date);
    const suffix = days ? ` (${days} día${days > 1 ? "s" : ""})` : "";
    return {
      id: s._id,
      nombre: `${s.diagnosis || "Incapacidad"}${suffix}`,
      fecha: formatFecha(s.start_date) || "—",
      fechaFin: formatFecha(s.end_date) || "—",
      // Vigente/No vigente se calcula contra la fecha de finalización real,
      // no contra el campo status guardado (que nunca se actualiza solo):
      // así el estado siempre refleja si la incapacidad ya venció o no, sin
      // importar cuándo se haya creado el registro.
      estado: isSickLeaveVigente(s.end_date) ? "Vigente" : "No vigente",
      // Campos crudos (sin formatear) para el botón de generar PDF y el
      // modal de editar: diagnóstico y fechas tal cual, días de reposo ya
      // calculado, y el doctor que la emitió (id + nombre), necesario para
      // restringir quién puede generar el PDF y para la firma del documento.
      diagnosisRaw: s.diagnosis || "",
      startDateRaw: s.start_date,
      endDateRaw: s.end_date,
      restDays: days || 1,
      doctorId: s.doctor_id?._id ? String(s.doctor_id._id) : null,
      // Procedimiento sin doctor (requires_doctor false): la enfermera asignada emitió la
      // incapacidad, no hay doctor que restrinja quién puede regenerar el PDF.
      nurseId: s.nurse_id?._id ? String(s.nurse_id._id) : null,
      // Sin prefijo "Dr.": PdfSignature (mismo componente que usa
      // ConsultationForm.jsx) ya imprime el nombre tal cual bajo la línea
      // de firma, sin anteponerlo, para que el PDF salga con el mismo
      // formato exacto sin importar desde dónde se generó.
      doctorName: s.doctor_id
        ? `${s.doctor_id.name || ""} ${s.doctor_id.last_name || ""}`.trim()
        : s.nurse_id
          ? `${s.nurse_id.name || ""} ${s.nurse_id.last_name || ""}`.trim()
          : "",
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
    extra.doctorOverride = { nombre: getDoctorName(latestConsultation.appointment_id?.doctor_id, latestConsultation.appointment_id?.nurse_id) };
    extra.ultimaVisitaOverride = {
      fecha: formatFecha(latestConsultation.date) || "—",
      hora: latestConsultation.appointment_id?.start_time && latestConsultation.appointment_id?.end_time
        ? `${latestConsultation.appointment_id.start_time} - ${latestConsultation.appointment_id.end_time}`
        : latestConsultation.appointment_id?.start_time || "—",
      _fecha: latestConsultation.date,
    };
  }

  return extra;
};

// Trae, para un paciente puntual, todo lo que necesita su expediente y
// que no vive en el documento de pacientes: consultas reales, citas
// pendientes de atender y sus incapacidades. Se ejecuta solo cuando
// cambia el paciente abierto, no en cada cambio de pestaña.
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

      const [consultations, appointmentsRes, sickLeaves, labOrders] = await Promise.all([
        apiClient("/consultations", { params: { patient_id: patientId } }),
        apiClient("/appointments", {
          params: { patient_id: patientId, status: "pending,scheduled,confirmed", limit: 50 },
        }),
        apiClient("/sick-leaves", { params: { patient_id: patientId } }),
        apiClient("/lab-orders", { params: { patient_id: patientId } }).catch(() => []),
      ]);

      setExtra(
        buildExtra(
          Array.isArray(consultations) ? consultations : [],
          Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [],
          Array.isArray(sickLeaves) ? sickLeaves : [],
          Array.isArray(labOrders) ? labOrders : [],
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
