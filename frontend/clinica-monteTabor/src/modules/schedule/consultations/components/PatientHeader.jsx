import { Calendar, Droplet, IdCard, Phone, Mail, Clock, Stethoscope } from "lucide-react";

// bloodTypeOverride lo pasa ConsultationForm.jsx para reflejar al
// instante lo que se guarda en BloodTypeCard.jsx (la tarjeta de la
// columna derecha), sin depender de recargar toda la cita. La edición
// del tipo de sangre vive ahí, no aquí, este encabezado es solo lectura.
const PatientHeader = ({ appointment, bloodTypeOverride }) => {
    if (!appointment) return null;

    const patient = appointment.patient_id;
    const doctor = appointment.doctor_id;
    // Procedimiento sin doctor (requires_doctor false): la enfermera asignada es quien
    // atiende, en vez de un doctor.
    const nurse = appointment.nurse_id;
    const bloodType = bloodTypeOverride ?? patient?.clinical_history?.blood_type ?? null;

    // Calcula edad aproximada a partir de la fecha de nacimiento del paciente,
    // si el backend la provee como birth_date.
    const getAge = (birthDate) => {
        if (!birthDate) return "—";
        const diff = Date.now() - new Date(birthDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    const isMale = patient?.gender === "M";

    return (
        <div className="bg-[#0b66d6] text-white rounded-xl px-5 py-4 mb-6">
            {/* Fila superior: icono de género, nombre y datos clave */}
            <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-2xl shrink-0">
                    {isMale ? "♂" : "♀"}
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                    <p className="font-semibold text-base whitespace-nowrap">
                        {patient?.name} {patient?.last_name}
                    </p>

                    <span className="flex items-center gap-1.5 text-sm text-white/90 whitespace-nowrap">
                        <Calendar className="w-4 h-4" />
                        {getAge(patient?.birth_date)} años
                    </span>

                    <span className="flex items-center gap-1.5 text-sm text-white/90 whitespace-nowrap">
                        <Droplet className="w-4 h-4" />
                        {bloodType ?? "—"}
                    </span>

                    <span className="flex items-center gap-1.5 text-sm text-white/90 whitespace-nowrap">
                        <IdCard className="w-4 h-4" />
                        {patient?.dui ?? "—"}
                    </span>
                </div>
            </div>

            {/* Separador */}
            <div className="border-t border-white/25 my-3" />

            {/* Fila inferior: contacto y detalles de la cita */}
            <div className="flex items-center gap-4 sm:gap-8 flex-wrap text-sm text-white/90 sm:pl-[3.25rem]">
                <span className="flex items-center gap-2 whitespace-nowrap">
                    <Phone className="w-4 h-4" />
                    <span className="text-white/70">Teléfono</span>
                    {patient?.phone ?? "—"}
                </span>

                <span className="flex items-center gap-2 whitespace-nowrap">
                    <Mail className="w-4 h-4" />
                    <span className="text-white/70">Correo</span>
                    {patient?.email ?? "—"}
                </span>

                <span className="flex items-center gap-2 whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    <span className="text-white/70">Última visita</span>
                    {appointment.date} {appointment.start_time} - {appointment.end_time}
                </span>

                <span className="flex items-center gap-2 whitespace-nowrap">
                    <Stethoscope className="w-4 h-4" />
                    <span className="text-white/70">{doctor ? "Doctor encargado" : "Enfermera encargada"}</span>
                    {doctor
                        ? `${doctor.name ?? "—"} ${doctor.last_name ?? "-"}`
                        : nurse
                            ? `${nurse.name ?? "—"} ${nurse.last_name ?? "-"}`
                            : "—"}
                </span>
            </div>
        </div>
    );
};

export default PatientHeader;
