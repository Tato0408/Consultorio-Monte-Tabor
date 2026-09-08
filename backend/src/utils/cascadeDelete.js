import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";
import appointmentsModel from "../models/appointments/appointments.js";
import consultationsModel from "../models/consultations/consultation.js";
import prescriptionsModel from "../models/consultations/prescription.js";
import labOrdersModel from "../models/consultations/labOrder.js";
import sickLeavesModel from "../models/sickLeaves/sickLeave.js";
import medicationLogModel from "../models/medicationLog/medicationLog.js";
import notificationModel from "../models/notifications/notification.js";
import nurseNotesModel from "../models/nurse_notes/nurse_notes.js";
import scheduleModel from "../models/schedule/schedule.js";

// Borrado en cascada de un paciente o un doctor junto con todo lo que
// depende de ellos: citas, consultas, recetas, ordenes de laboratorio,
// incapacidades, notas de enfermeria, registros de medicacion, horario y
// notificaciones. La gestion de usuarios lo usa cuando el administrador
// confirma que quiere eliminar al usuario aunque tenga registros
// relacionados. Todo corre dentro de una transaccion: si algo falla, no se
// borra nada.

// Cuenta las citas y consultas ligadas a un paciente, para avisar al
// administrador cuantos registros se llevaria por delante antes de que
// confirme.
export const countPatientRelatedRecords = async (patientId) => {
  const [appointments, consultations] = await Promise.all([
    appointmentsModel.countDocuments({ patient_id: patientId }),
    consultationsModel.countDocuments({ patient_id: patientId }),
  ]);
  return { appointments, consultations };
};

// Cuenta las citas y consultas ligadas a un doctor (las consultas incluyen
// tanto las de sus citas como aquellas donde figura como responsable de un
// procedimiento).
export const countDoctorRelatedRecords = async (doctorId) => {
  const doctorAppointmentIds = await appointmentsModel.distinct("_id", { doctor_id: doctorId });
  const [appointments, consultations] = await Promise.all([
    Promise.resolve(doctorAppointmentIds.length),
    consultationsModel.countDocuments({
      $or: [
        { appointment_id: { $in: doctorAppointmentIds } },
        { "procedure.doctor_id": doctorId },
      ],
    }),
  ]);
  return { appointments, consultations };
};

// Elimina al paciente y toda su informacion relacionada.
export const deletePatientCascade = async (patientId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const appointmentDocs = await appointmentsModel
        .find({ patient_id: patientId }, "_id").session(session).lean();
      const appointmentIds = appointmentDocs.map((d) => d._id);
      const consultationDocs = await consultationsModel
        .find({ patient_id: patientId }, "_id").session(session).lean();
      const consultationIds = consultationDocs.map((d) => d._id);

      await prescriptionsModel.deleteMany(
        { consultation_id: { $in: consultationIds } },
        { session }
      );
      await labOrdersModel.deleteMany(
        {
          $or: [
            { patient_id: patientId },
            { consultation_id: { $in: consultationIds } },
            { appointment_id: { $in: appointmentIds } },
          ],
        },
        { session }
      );
      await sickLeavesModel.deleteMany({ patient_id: patientId }, { session });
      await medicationLogModel.deleteMany({ patient_id: patientId }, { session });
      await nurseNotesModel.deleteMany({ patient_id: patientId }, { session });
      await notificationModel.deleteMany(
        {
          $or: [
            { recipient_role: "patient", recipient_id: patientId },
            { appointment_id: { $in: appointmentIds } },
          ],
        },
        { session }
      );
      await consultationsModel.deleteMany({ patient_id: patientId }, { session });
      await appointmentsModel.deleteMany({ patient_id: patientId }, { session });
      await patientsModel.deleteOne({ _id: patientId }, { session });
    });
  } finally {
    await session.endSession();
  }
};

// Elimina al doctor y toda su informacion relacionada. Borra tambien las
// consultas y sus documentos derivados: al eliminar al doctor, esos
// registros clinicos dejan de tener responsable y el administrador ya
// confirmo que quiere eliminarlos. Las imagenes en Cloudinary (foto y
// licencia) se borran despues de la transaccion, porque no forman parte de
// la base de datos.
export const deleteDoctorCascade = async (doctorId) => {
  const doctor = await doctorsModel.findById(doctorId).select("img_public_id license_public_id");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const appointmentDocs = await appointmentsModel
        .find({ doctor_id: doctorId }, "_id").session(session).lean();
      const appointmentIds = appointmentDocs.map((d) => d._id);
      const consultationDocs = await consultationsModel
        .find({
          $or: [
            { appointment_id: { $in: appointmentIds } },
            { "procedure.doctor_id": doctorId },
          ],
        }, "_id").session(session).lean();
      const consultationIds = consultationDocs.map((d) => d._id);

      await prescriptionsModel.deleteMany(
        { consultation_id: { $in: consultationIds } },
        { session }
      );
      await labOrdersModel.deleteMany(
        {
          $or: [
            { consultation_id: { $in: consultationIds } },
            { appointment_id: { $in: appointmentIds } },
          ],
        },
        { session }
      );
      await sickLeavesModel.deleteMany(
        {
          $or: [
            { doctor_id: doctorId },
            { consultation_id: { $in: consultationIds } },
          ],
        },
        { session }
      );
      await nurseNotesModel.deleteMany(
        { appointment_id: { $in: appointmentIds } },
        { session }
      );
      await notificationModel.deleteMany(
        {
          $or: [
            { recipient_role: "doctor", recipient_id: doctorId },
            { appointment_id: { $in: appointmentIds } },
          ],
        },
        { session }
      );
      // Cada consulta que se borra puede haber empujado procedimientos al
      // expediente de su paciente (ver syncProcedureHistory en
      // consultation.js): se limpian esas entradas de todos los pacientes.
      await patientsModel.updateMany(
        {},
        { $pull: { "clinical_history.procedures": { consultation_id: { $in: consultationIds } } } },
        { session }
      );
      await consultationsModel.deleteMany(
        { _id: { $in: consultationIds } },
        { session }
      );
      await appointmentsModel.deleteMany({ doctor_id: doctorId }, { session });
      await scheduleModel.deleteMany({ doctor_id: doctorId }, { session });
      await doctorsModel.deleteOne({ _id: doctorId }, { session });
    });
  } finally {
    await session.endSession();
  }

  // Limpieza de Cloudinary fuera de la transaccion: un fallo aqui solo deja
  // archivos huerfanos en el almacenamiento externo, no afecta la base.
  for (const publicId of [doctor?.img_public_id, doctor?.license_public_id]) {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId).catch((error) =>
        console.log("Error eliminando imagen del doctor en Cloudinary:", error)
      );
    }
  }
};
