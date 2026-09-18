import { Calendar, Droplet, IdCard, Phone, Mail, Clock, Stethoscope } from "lucide-react";
import { formatTime12h } from "@/lib/timeFormat";

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
    // bloodTypeOverride solo se llena al guardar desde BloodTypeCard.jsx (personal clínico),
    // que siempre deja blood_type_verified en true; sin override, se usa el valor real del
    // paciente, que puede venir autoreportado desde el portal (ver blood_type_verified en el
    // modelo de pacientes).
    const bloodTypeVerified = bloodTypeOverride ? true : !!patient?.clinical_history?.blood_type_verified;

    // Calcula edad aproximada a partir de la fecha de nacimiento del paciente,
    // si el backend la provee como birth_date.
    const getAge = (birthDate) => {
        if (!birthDate) return "—";
        const diff = Date.now() - new Date(birthDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    const isMale = patient?.gender === "M";

    // Solo la fecha de la consulta (sin la parte de hora del ISO), en zona
    // horaria UTC para no correr el día, más el rango de horas de la cita.
    const formatVisitDate = (value) => {
        if (!value) return "—";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "—";
        return new Intl.DateTimeFormat("es-SV", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
        }).format(parsed);
    };

    const visitDate = formatVisitDate(appointment.date);
    const visitRange = appointment.start_time && appointment.end_time
        ? `${formatTime12h(appointment.start_time)} - ${formatTime12h(appointment.end_time)}`
        : "";

    const doctorName = doctor
        ? `${doctor.name ?? "—"} ${doctor.last_name ?? "-"}`
        : nurse
            ? `${nurse.name ?? "—"} ${nurse.last_name ?? "-"}`
            : "—";

    // Cada dato del encabezado. Se pintan en una cuadrícula que reparte las
    // celdas en tantas columnas como quepan (auto-fit), y el valor largo se
    // parte dentro de su celda en vez de desbordar el recuadro azul.
    const fields = [
        { icon: Calendar, label: "Edad", value: `${getAge(patient?.birth_date)} años` },
        { icon: Droplet, label: "Tipo de sangre", value: bloodType ? `${bloodType}${bloodTypeVerified ? "" : " (autoreportado)"}` : "—" },
        { icon: IdCard, label: "DUI", value: patient?.dui ?? "—" },
        { icon: Phone, label: "Teléfono", value: patient?.phone ?? "—" },
        { icon: Mail, label: "Correo", value: patient?.email ?? "—", breakAll: true },
        {
            icon: Clock,
            label: "Última visita",
            value: `${visitDate}${visitRange ? ` · ${visitRange}` : ""}`,
        },
        { icon: Stethoscope, label: doctor ? "Doctor encargado" : "Enfermera encargada", value: doctorName },
    ];

    return (
        <div className="bg-[#0b66d6] text-white rounded-xl px-4 py-4 sm:px-5 mb-6 overflow-hidden">
            {/* Encabezado: icono de género y nombre del paciente */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-2xl shrink-0">
                    {isMale ? "♂" : "♀"}
                </div>
                <p className="font-semibold text-base break-words min-w-0">
                    {patient?.name} {patient?.last_name}
                </p>
            </div>

            {/* Separador */}
            <div className="border-t border-white/25 my-3" />

            {/* Datos en cuadrícula: se reacomodan en columnas según el ancho
                disponible y el texto largo se parte dentro de su celda. */}
            <div
                className="grid gap-x-6 gap-y-3 text-sm text-white/90"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
            >
                {fields.map(({ icon: Icon, label, value, breakAll }) => (
                    <div key={label} className="flex items-start gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <span className="block text-xs text-white/60">{label}</span>
                            <span className={`block min-w-0 ${breakAll ? "break-all" : "break-words"}`}>
                                {value}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PatientHeader;
