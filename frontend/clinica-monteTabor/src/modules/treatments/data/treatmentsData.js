// Mapa de colores por estado, usado por las insignias visuales de la tabla
// y el panel de tratamiento. Los estados los asigna el backend en
// treatmentsController.js (getFollowUp), a partir del historial real de
// procedimientos de cada paciente. No incluye "Suspendido" porque
// getFollowUp nunca asigna ese estado.
export const STATUS_STYLE = {
  "En tratamiento":    "green",
  "Requiere revisión": "orange",
  "Finalizado":        "blue",
};
