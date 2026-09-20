import consultationsModel from "../models/consultations/consultation.js";
import prescriptionsModel from "../models/consultations/prescription.js";
import labOrdersModel from "../models/consultations/labOrder.js";
import patientsModel from "../models/patients/patients.js";
import appointmentsModel from "../models/appointments/appointments.js";
import { detach_treatment_from_consultation } from "./treatmentSync.js";

// Borra en cascada todo lo que depende de una consulta ya identificada
// (recibe el documento ya eliminado, con su _id, patient_id y
// appointment_id todavía disponibles): la receta, la orden de laboratorio
// que enlazaba, la entrada que dejó en el expediente del paciente, el
// tratamiento que originó (se desvincula, no se borra) y la cita que la
// generó. Compartida por los puntos de borrado que existen (consulta por su
// propio id desde el expediente, consulta por el id de su cita desde la
// tabla de Consultas, y cita directa desde la pantalla de Citas), para que
// ninguno deje una cita, receta u orden de laboratorio huérfana sin
// importar por cuál pantalla se elimine.
export const cascadeDeleteConsultation = async (consultation) => {
  if (consultation.patient_id) {
    await patientsModel.updateOne(
      { _id: consultation.patient_id },
      { $pull: { "clinical_history.procedures": { consultation_id: consultation._id } } }
    );
  }

  const labOrderOr = [{ consultation_id: consultation._id }];
  if (consultation.appointment_id) {
    labOrderOr.push({ appointment_id: consultation.appointment_id });
  }
  await labOrdersModel.deleteOne({ $or: labOrderOr });

  await prescriptionsModel.deleteOne({ consultation_id: consultation._id });

  await detach_treatment_from_consultation(consultation._id);

  if (consultation.appointment_id) {
    await appointmentsModel.findByIdAndDelete(consultation.appointment_id);
  }
};

// Borra una cita completa: si ya tiene una consulta registrada, la borra con
// toda su cascada (que a su vez borra la cita, ver arriba); si no la tiene
// (una cita cancelada, no presentada, o completada cuyo registro clínico
// nunca se guardó), borra la cita directamente junto con cualquier orden de
// laboratorio huérfana que haya quedado ligada a ella. Devuelve el
// documento de la cita ya eliminada (o null si no existía), para que quien
// llame pueda notificar a los involucrados con sus datos.
export const deleteAppointmentCascade = async (appointmentId) => {
  const appointment = await appointmentsModel.findById(appointmentId);
  if (!appointment) return null;

  const consultation = await consultationsModel.findOneAndDelete({ appointment_id: appointmentId });
  if (consultation) {
    await cascadeDeleteConsultation(consultation);
  } else {
    await labOrdersModel.deleteOne({ appointment_id: appointmentId });
    await appointmentsModel.findByIdAndDelete(appointmentId);
  }

  return appointment;
};
