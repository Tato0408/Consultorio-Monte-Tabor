import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";

// Alcance de visibilidad por estado activo. Un paciente o doctor con
// is_active en false sigue existiendo en la base de datos (nunca se elimina)
// pero debe desaparecer de todos los flujos operativos y clinicos: citas,
// consultas, expediente, tratamientos, agenda. Solo se le sigue viendo en la
// gestion de usuarios. Estas utilidades centralizan ese filtro para no
// repetir la misma consulta de is_active en cada controlador.
//
// Un documento viejo sin el campo is_active se considera activo: la consulta
// { is_active: false } no lo selecciona, asi que no aparece en las listas de
// inactivos y nunca se oculta por error.

// Devuelve los _id de todos los pacientes inactivos.
export const getInactivePatientIds = () =>
  patientsModel.distinct("_id", { is_active: false });

// Devuelve los _id de todos los doctores inactivos.
export const getInactiveDoctorIds = () =>
  doctorsModel.distinct("_id", { is_active: false });

// Fragmento de filtro Mongo para excluir de una consulta sobre la coleccion
// de citas (o consultas que referencian una cita por los mismos campos) las
// que pertenecen a un paciente inactivo o que estan asignadas a un doctor
// inactivo. Una cita sin doctor asignado (doctor_id null) no se excluye por
// ese motivo: todavia puede tomarla un doctor activo.
export const buildActivePartiesAppointmentFilter = async () => {
  const [inactivePatientIds, inactiveDoctorIds] = await Promise.all([
    getInactivePatientIds(),
    getInactiveDoctorIds(),
  ]);

  const filter = {};
  if (inactivePatientIds.length) {
    filter.patient_id = { $nin: inactivePatientIds };
  }
  if (inactiveDoctorIds.length) {
    filter.$or = [
      { doctor_id: null },
      { doctor_id: { $exists: false } },
      { doctor_id: { $nin: inactiveDoctorIds } },
    ];
  }
  return filter;
};

// Verifica que las partes involucradas en una escritura (asignar una cita,
// guardar una consulta) esten activas. Devuelve null si todo esta en orden, o
// un mensaje de error listo para responder con 400. patientId y doctorId son
// opcionales: solo se valida lo que se recibe.
export const assertActiveParties = async ({ patientId, doctorId } = {}) => {
  if (patientId) {
    const patient = await patientsModel.findById(patientId).select("is_active").lean();
    // Antes, un patient_id que no correspondía a ningún paciente (borrado,
    // mal enviado desde un cliente que no pasa por el formulario) pasaba
    // esta validación sin error: patient quedaba null y la condición de
    // abajo solo miraba is_active, nunca si el documento existía. Eso dejaba
    // crear una cita o consulta sin paciente real (la vista la mostraba
    // luego con todos los campos de paciente vacíos).
    if (!patient) {
      return "El paciente seleccionado no existe.";
    }
    if (patient.is_active === false) {
      return "El paciente está inactivo. Reactívalo para poder asignarlo o registrar información suya.";
    }
  }
  if (doctorId) {
    const doctor = await doctorsModel.findById(doctorId).select("is_active").lean();
    if (!doctor) {
      return "El doctor seleccionado no existe.";
    }
    if (doctor.is_active === false) {
      return "El doctor está inactivo. Reactívalo para poder asignarle citas o consultas.";
    }
  }
  return null;
};

// Indica si un id de paciente puntual corresponde a un paciente inactivo.
// Se usa en los endpoints que siempre reciben un patient_id concreto (lista
// de consultas, incapacidades y ordenes de laboratorio del expediente).
export const isPatientInactive = async (patientId) => {
  if (!patientId) return false;
  const patient = await patientsModel.findById(patientId).select("is_active").lean();
  return !!patient && patient.is_active === false;
};
