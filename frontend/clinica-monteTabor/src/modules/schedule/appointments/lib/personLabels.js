// Etiquetas de personas para los selectores de agendado de citas (todos los roles).
// El paciente se identifica por su DUI (si lo tiene: los menores de edad no), y el
// doctor por su número de licencia.

export const patientLabel = (p) => {
  const nombre = `${p?.name || ""} ${p?.last_name || ""}`.trim();
  return p?.dui ? `${nombre} - ${p.dui}` : nombre;
};

export const doctorLabel = (d) => {
  const nombre = `Dr. ${d?.name || ""} ${d?.last_name || ""}`.trim();
  return d?.license_number ? `${nombre} - ${d.license_number}` : nombre;
};

export const nurseLabel = (n) => `${n?.name || ""} ${n?.last_name || ""}`.trim();
