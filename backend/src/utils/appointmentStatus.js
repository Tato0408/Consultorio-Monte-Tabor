// Estados de una cita y qué significa cada grupo. Centralizado para que la web privada,
// el portal público y el móvil no queden desincronizados.
//
// Flujo:
//   pending           -> solicitud del paciente; espera que un doctor/enfermera la acepte.
//   scheduled         -> aceptada; recién aquí el cupo del proveedor queda tomado.
//   completed         -> ya se atendió (la consulta la marca así).
//   cancelled         -> cancelada por el paciente o el personal.
//   no_show           -> era una cita YA aceptada (scheduled) cuya hora de fin pasó sin
//                        que se realizara la consulta. Estado final.
//   needs_reschedule  -> la solicitud del paciente venció sin que nadie la aceptara, o el
//                        proveedor le dio el cupo a otro paciente. El paciente puede
//                        reagendarla (vuelve a pending). Ver reschedule_reason.
//   expired           -> solicitud sin aceptar durante demasiado tiempo (regla de 48 h).
//                        Tratada igual que needs_reschedule para el paciente.

// Una cita SOLO ocupa el horario del proveedor en estos estados. Agendar una solicitud
// (pending) NO reserva el cupo: varios pacientes pueden pedir el mismo horario y el
// proveedor decide a quién acepta.
export const OCCUPYING_STATUSES = ["scheduled", "completed"];

// Estados finales para el paciente: ya no se puede cancelar ni modificar.
export const CLOSED_STATUSES = ["completed", "cancelled", "no_show"];

// El paciente puede reagendar desde estos estados.
export const RESCHEDULABLE_STATUSES = ["needs_reschedule", "expired"];

// Motivos por los que una cita quedó en needs_reschedule.
export const RESCHEDULE_REASONS = {
    NOT_ACCEPTED: "no_aceptada",   // ningún proveedor la aceptó antes de su hora de fin
    SLOT_TAKEN: "cupo_asignado",   // el proveedor aceptó a otro paciente para ese horario
};
