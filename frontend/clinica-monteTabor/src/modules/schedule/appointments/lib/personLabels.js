// Etiquetas de personas para los selectores de agendado de citas (todos los roles).
// El paciente se identifica por su DUI (si lo tiene: los menores de edad no), el
// doctor por su número de licencia y la enfermera por su DUI. El doctor espejo del
// admin (is_admin_mirror) no tiene licencia real, así que se identifica con su cargo.


// Cargo con el que se muestra al doctor espejo del admin, según el género
// registrado en su perfil.
const admin_role_label = (doctor) => {
  if (doctor?.gender === "Femenino") return "Administradora";
  if (doctor?.gender === "Masculino") return "Administrador";
  return "Administrador/a";
};

// Nombre del doctor y su identificador por separado: licencia, o cargo si es el
// doctor espejo del admin. Lo usan doctorLabel y el diseño de PersonOption.
export const doctor_parts = (d) => ({
  name: `Dr. ${d?.name || ""} ${d?.last_name || ""}`.trim(),
  tag: d?.is_admin_mirror ? admin_role_label(d) : d?.license_number || "",
  is_admin: Boolean(d?.is_admin_mirror),
});

// Nombre de la enfermera y su DUI por separado.
export const nurse_parts = (n) => ({
  name: `${n?.name || ""} ${n?.last_name || ""}`.trim(),
  tag: n?.dui || "",
  is_admin: false,
});

// Nombre del paciente y su DUI por separado (los menores de edad pueden no
// tener DUI, en ese caso solo se muestra el nombre).
export const patient_parts = (p) => ({
  name: `${p?.name || ""} ${p?.last_name || ""}`.trim(),
  tag: p?.dui || "",
  is_admin: false,
});

// Texto plano de la opción, el que se busca al escribir y se muestra en el
// selector una vez elegida.
const join_parts = ({ name, tag }) => (tag ? `${name} · ${tag}` : name);

export const patientLabel = (p) => join_parts(patient_parts(p));

export const doctorLabel = (d) => join_parts(doctor_parts(d));

export const nurseLabel = (n) => join_parts(nurse_parts(n));
