import apiClient from "@/lib/apiClient";

// Todas estas llamadas requieren que el paciente tenga sesión iniciada
// (endpoints bajo /api/patient-portal en el backend)

export const getDoctors = () => apiClient("/patient-portal/doctors");

// Solo doctores activos que ya configuraron al menos un día laborable en su
// horario. Se usa en el paso "elegir doctor" del agendamiento (modo doctor primero):
// un doctor sin horario configurado no tiene días ni horas que calcular, así que no
// puede aparecer como opción ahí.
export const getSchedulableDoctors = () => apiClient("/patient-portal/doctors-schedulable");

// Mismo criterio que getSchedulableDoctors, pero para procedimientos sin doctor
// (requires_doctor false): ahí la enfermera es la proveedora principal, así que el
// paso "elegir doctor primero" pasa a listar enfermeras en su lugar.
export const getSchedulableNurses = () => apiClient("/patient-portal/nurses-schedulable");

export const getProcedures = () => apiClient("/patient-portal/procedures");

// includeBooked: true trae también los horarios ya ocupados por otra cita de
// este doctor (marcados con available:false), para que el paciente los vea
// bloqueados en el calendario en vez de que simplemente desaparezcan de la
// lista sin explicación.
export const getAvailableSlots = (doctorId, date, duration) =>
  apiClient(`/patient-portal/schedule/${doctorId}/slots`, { params: { date, duration, includeBooked: true } });

// Mirror de getAvailableSlots para una enfermera proveedora principal (procedimiento
// sin doctor, ver getSchedulableNurses).
export const getNurseAvailableSlots = (nurseId, date, duration) =>
  apiClient(`/patient-portal/nurse-schedule/${nurseId}/slots`, { params: { date, duration, includeBooked: true } });

// Días de la semana (0 a 6) que el doctor atiende y sus excepciones de fecha
// (vacaciones, días no laborables, horario especial), para bloquear en el
// calendario los días que no trabaja antes de elegir una fecha puntual.
export const getDoctorWorkingDays = (doctorId) =>
  apiClient(`/patient-portal/schedule/${doctorId}/working-days`);

// Mirror de getDoctorWorkingDays para una enfermera proveedora principal.
export const getNurseWorkingDays = (nurseId) =>
  apiClient(`/patient-portal/nurse-schedule/${nurseId}/working-days`);

// Horarios agregados entre todos los doctores para una fecha y tipo de
// atención, sin revelar todavía qué doctor los cubre.
export const getPatientAvailableSlots = (date, procedureId) =>
  apiClient("/schedule/patient-available-slots", { params: { date, procedure_id: procedureId } });

// Doctores que pueden atender un horario ya elegido del listado anterior.
export const getDoctorsForSlot = (date, startTime, procedureId) =>
  apiClient("/schedule/patient-doctors-for-slot", { params: { date, start_time: startTime, procedure_id: procedureId } });

export const bookAppointment = (data) =>
  apiClient("/patient-portal/appointments", { method: "POST", body: data });

export const getMyAppointments = () => apiClient("/patient-portal/appointments");

export const cancelAppointment = (id, reason) =>
  apiClient(`/patient-portal/appointments/${id}/cancel`, {
    method: "PATCH",
    body: reason ? { cancellation_reason: reason } : undefined,
  });

// Reagenda una cita propia que quedó "por reagendar" (needs_reschedule/expired) o una
// "pending" que el paciente quiere mover: reusa el mismo registro (conserva el anticipo
// ya pagado) y la deja de nuevo "pending" a la espera de que un doctor la acepte.
// doctor_id / nurse_id son opcionales: sin ellos la cita queda sin asignar.
export const rescheduleAppointment = (id, { date, start_time, doctor_id, nurse_id }) =>
  apiClient(`/patient-portal/appointments/${id}/reschedule`, {
    method: "PATCH",
    body: { date, start_time, doctor_id, nurse_id },
  });

// Confirma (contra la propia API de Wompi, del lado del servidor) que la transacción ya cobrada
// realmente fue aprobada, y recién ahí pasa la cita de "pending" a "scheduled"
export const confirmPayment = (appointmentId, transactionId) =>
  apiClient(`/patient-portal/appointments/${appointmentId}/confirm-payment`, {
    method: "POST",
    body: { transactionId },
  });