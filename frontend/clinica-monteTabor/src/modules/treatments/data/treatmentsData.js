// Color de la insignia de estado, por tono que devuelve el backend
// (treatmentsController.derive_badge). Las claves coinciden con las de
// StatusBadge (ver modules/reports/components/StatusBadge.jsx).
export const badge_color_by_tone = {
  green: "green",
  gray: "gray",
  blue: "blue",
  red: "red",
  purple: "purple",
  orange: "orange",
};

// Pestañas de la lista de tratamientos. El valor "requiere_control" no es
// un estado real: filtra los tratamientos activos con el control vencido.
export const treatment_tabs = [
  { key: "activo", label: "Activos" },
  { key: "en_pausa", label: "En pausa" },
  { key: "requiere_control", label: "Requieren control" },
  { key: "cerrado", label: "Cerrados" },
];

// Ícono y color de cada tipo de entrada de la línea de tiempo. type es el
// entry_type del backend. tone se usa como color de fondo del punto y de
// la etiqueta.
export const timeline_entry_meta = {
  inicio: { label: "Inicio del tratamiento", tone: "green" },
  evolucion: { label: "Evolución", tone: "blue" },
  nota: { label: "Nota", tone: "amber" },
  cambio_plan: { label: "Cambio de plan", tone: "purple" },
  control: { label: "Control", tone: "teal" },
  documento: { label: "Documento", tone: "slate" },
  cierre: { label: "Cierre del tratamiento", tone: "red" },
  reapertura: { label: "Reapertura", tone: "green" },
  pausa: { label: "Pausa", tone: "slate" },
};
