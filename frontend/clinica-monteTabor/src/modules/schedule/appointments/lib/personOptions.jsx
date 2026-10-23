import PersonOption from "../components/PersonOption";
import { doctor_parts, nurse_parts, patient_parts, doctorLabel, nurseLabel, patientLabel } from "./personLabels";

// Opción lista para DataCombobox: value, texto plano (label) y contenido con diseño.
// with_specialty agrega la especialidad del doctor como detalle.
export const doctor_option = (d, { with_specialty = false } = {}) => {
    const detail = with_specialty && d?.specialty ? d.specialty : "";
    return {
        value: d._id,
        label: detail ? `${doctorLabel(d)} · ${detail}` : doctorLabel(d),
        content: <PersonOption {...doctor_parts(d)} detail={detail} />,
    };
};

export const nurse_option = (n) => ({
    value: n._id,
    label: nurseLabel(n),
    content: <PersonOption {...nurse_parts(n)} />,
});

export const patient_option = (p) => ({
    value: p._id,
    label: patientLabel(p),
    content: <PersonOption {...patient_parts(p)} />,
});
