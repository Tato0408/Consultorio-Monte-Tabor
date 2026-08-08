// Los datos de ejemplo (pacientes, gráfica de evolución y controles inventados) se quitaron de
// aquí — la pantalla de Tratamientos ahora consume GET /api/treatments/follow-up, armado a
// partir del historial real de procedimientos de cada paciente (ver treatmentsController.js).
// Solo se conserva el mapa de colores por estado, que sigue siendo puramente visual.
// "Suspendido" se quitó: getFollowUp nunca lo asigna (no existe ningún dato real que represente
// un tratamiento "suspendido" en el sistema — ver treatmentsController.js), así que dejarlo aquí
// solo generaba un filtro que siempre mostraba cero resultados.
export const STATUS_STYLE = {
  "En tratamiento":    "green",
  "Requiere revisión": "orange",
  "Finalizado":        "blue",
};
