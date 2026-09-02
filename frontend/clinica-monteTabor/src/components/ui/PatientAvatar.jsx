// Avatar de un paciente con sus iniciales. Los pacientes no suben foto, así
// que este es su identificador visual en todo el sistema (expediente y
// gestión de pacientes). El color va según el sexo —rosa para femenino,
// azul para masculino— y gris si el paciente está inactivo.

const initialsOf = (name, lastName) => {
  const a = (name || "").trim()[0] || "";
  const b = (lastName || "").trim()[0] || "";
  return (a + b).toUpperCase() || "—";
};

const toneOf = (gender, active) => {
  if (!active) return "bg-slate-100 text-slate-400";
  return (gender || "").toLowerCase().startsWith("f")
    ? "bg-[#FBEAEE] text-[#D44C68]"
    : "bg-[#EAF1FD] text-[#3B6FCA]";
};

// sm: 36px, para filas de tabla. lg: 64px, para tarjetas de detalle.
const SIZES = {
  sm: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-xl",
};

const PatientAvatar = ({ name, lastName, gender, active = true, size = "sm", className = "" }) => (
  <div
    className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold ${
      SIZES[size] || SIZES.sm
    } ${toneOf(gender, active)} ${className}`}
  >
    {initialsOf(name, lastName)}
  </div>
);

export default PatientAvatar;
