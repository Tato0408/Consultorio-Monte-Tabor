// Normaliza procedure_id a un arreglo. El campo es un arreglo en el esquema actual
// (una cita puede combinar varios procedimientos), pero si el backend desplegado en
// producción todavía no tiene esa migración (ver notas de desfase de despliegue en
// project_render_deploy_lag), puede devolver un solo objeto/ObjectId suelto. Sin este
// resguardo, cualquier .map()/.join() sobre ese valor revienta toda la pantalla con
// "undefined is not a function" en vez de solo degradar la información mostrada.
export const asProcedureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};
