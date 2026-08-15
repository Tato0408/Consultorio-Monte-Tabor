// Reglas de validación compartidas por los formularios de usuarios de staff (doctores,
// recepcionistas, enfermeras). Debe reflejar exactamente la misma regla que el backend
// (backend/src/utils/validators.js) para que ambos lados nunca queden desincronizados.

// Edad mínima para el staff. Los pacientes quedan fuera de esta regla a propósito.
export const MIN_STAFF_AGE = 18;

// Fecha máxima seleccionable en un <input type="date"> para que solo se puedan elegir
// fechas de nacimiento de personas que ya cumplieron MIN_STAFF_AGE años hoy.
export const getMaxAdultBirthDate = () => {
  const today = new Date();
  const year = today.getFullYear() - MIN_STAFF_AGE;
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Interpreta "YYYY-MM-DD" como año, mes y día locales. new Date("YYYY-MM-DD") a secas se
// interpreta como medianoche UTC, y luego getMonth() y getDate() la leen en hora local, lo
// que en zonas horarias detrás de UTC corre la fecha un día hacia atrás. El constructor
// (year, month, day) evita ese corrimiento.
const parseDateOnly = (value) => {
  const datePart = String(value).trim().split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

// Edad exacta (en años cumplidos) a partir de una fecha de nacimiento "YYYY-MM-DD", o null si
// el valor está vacío o no es una fecha válida. Usa el mismo parseo seguro que el resto del
// archivo para no reintroducir el corrimiento de zona horaria de un día.
export const calculateAge = (value) => {
  if (!value) return null;

  const birthDate = parseDateOnly(value);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
};

// Validador para usar directamente en react-hook-form (register("birth_date", { validate: ... })).
// Devuelve true si la persona ya es mayor de edad, o el mensaje de error si no.
export const validateAdultBirthDate = (value) => {
  if (!value) return true;

  const age = calculateAge(value);
  if (age === null) return true;

  return age >= MIN_STAFF_AGE || `Debe ser mayor de edad (al menos ${MIN_STAFF_AGE} años)`;
};
