import { confirmTakeOverAppointment } from "@/lib/alerts";

// Indica si la cita exige doctor: basta con que alguno de sus procedimientos
// lo requiera, y sin procedimientos se asume que sí (consulta médica general).
const requires_doctor = (appointment) =>
    !appointment?.procedure_id?.length
    || appointment.procedure_id.some((p) => p?.requires_doctor !== false);

const id_of = (value) => (value?._id ? String(value._id) : value ? String(value) : null);

const full_name = (person) => `${person?.name || ""} ${person?.last_name || ""}`.trim();

/*
 * Devuelve el proveedor dueño de una cita: el doctor si la cita exige doctor,
 * o la enfermera principal si es un procedimiento solo de enfermería. Recibe
 * la cita con doctor_id, nurse_id y procedure_id poblados y devuelve
 * { id, label }, donde label es el texto para mostrar ("el Dr(a). Ana López"
 * o "la enfermera Ana López"). id queda en null si la cita no tiene dueño.
 */
export const get_appointment_owner = (appointment) => {
    if (requires_doctor(appointment)) {
        const doctor = appointment?.doctor_id;
        return { id: id_of(doctor), label: `el Dr(a). ${full_name(doctor) || "asignado"}` };
    }
    const nurse = appointment?.nurse_id;
    return { id: id_of(nurse), label: `la enfermera ${full_name(nurse) || "asignada"}` };
};

/*
 * Antes de que una enfermera o una recepcionista atienda una cita que
 * pertenece a otro proveedor, muestra la confirmación de que esa cita es de
 * él y que debió coordinarlo antes. Para el dueño de la cita, el doctor o el
 * admin no pregunta nada. Devuelve true si se puede continuar.
 */
export const confirm_attend_for_owner = async (appointment, { user, userType }) => {
    if (!["nurse", "receptionist"].includes(userType)) return true;
    const owner = get_appointment_owner(appointment);
    if (!owner.id || owner.id === String(user?.id)) return true;
    return confirmTakeOverAppointment(owner.label);
};
