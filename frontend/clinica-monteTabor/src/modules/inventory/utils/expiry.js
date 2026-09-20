// Misma ventana que el virtual expiryStatus del modelo de inventario en el
// backend y que el filtro "expiry" de GET /inventory: no cambiar uno sin el otro.
export const EXPIRY_WINDOW_DAYS = 30;

// Días hasta el vencimiento (negativo o cero si ya venció). null si el
// producto no tiene fecha de vencimiento registrada.
export const getExpiryDays = (expirationDate) => {
  if (!expirationDate) return null;
  const diff = new Date(expirationDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Estado de caducidad, independiente del estado de stock. Sin fecha de
// vencimiento se considera Vigente.
export const getExpiryStatus = (expirationDate) => {
  const days = getExpiryDays(expirationDate);
  if (days === null) return "Vigente";
  if (days <= 0) return "Caduco";
  if (days <= EXPIRY_WINDOW_DAYS) return "Próximo a vencer";
  return "Vigente";
};

// Etiqueta lista para mostrar: "Vencido" en vez de un número negativo de
// días, "Próximo a vencer N días" en la ventana de aviso, "Vigente" fuera de ella.
export const getExpiryLabel = (expirationDate) => {
  const days = getExpiryDays(expirationDate);
  if (days === null) return "Vigente";
  if (days <= 0) return "Vencido";
  if (days <= EXPIRY_WINDOW_DAYS) return `Próximo a vencer ${days} días`;
  return "Vigente";
};
