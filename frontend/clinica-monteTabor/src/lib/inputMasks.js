// Máscaras y límites de longitud reutilizables para los inputs del sistema — mismo criterio que
// ya usaban por su cuenta los formularios de personas (Doctors/Nurses/Receptionist/Patients/
// EditPatient: solo letras en nombres, solo dígitos en teléfono/DUI), centralizado aquí para no
// reescribir la misma regex en cada formulario nuevo.

// Solo letras (con acentos/ñ), espacios, apóstrofes y guiones — para nombres, apellidos,
// parentescos, enfermedades y cualquier campo de texto corto que no deba llevar números ni
// símbolos.
export const maskLettersOnly = (raw, maxLength = 50) =>
  raw.replace(/[^A-Za-zÀ-ÿ\s'-]/g, "").slice(0, maxLength);

// Solo dígitos — cantidades enteras, códigos puramente numéricos, etc.
export const maskDigitsOnly = (raw, maxLength) => {
  const digits = raw.replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
};

// Letras, dígitos, espacios y guiones — para códigos alfanuméricos de negocio (número de
// licencia, SKU/código de producto) que no son ni un nombre puro ni un número puro.
export const maskAlnum = (raw, maxLength = 30) =>
  raw.replace(/[^A-Za-zÀ-ÿ0-9\s'-]/g, "").slice(0, maxLength);

// Dígitos + un único punto decimal — precios, pesos, medidas.
export const maskDecimalOnly = (raw, maxLength) => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const result =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  return maxLength ? result.slice(0, maxLength) : result;
};

// Límites estándar por tipo de campo, para no repetir el mismo número mágico en cada formulario.
export const MAX_LENGTHS = {
  name: 50,
  shortText: 50,
  mediumText: 100,
  longText: 500,
  email: 100,
};

// Un <input type="date"> nativo ya impide elegir un día calendario inexistente (ej. 30 de
// febrero) desde su selector visual, pero si el valor llega manualmente (autocompletado, pegado,
// o un navegador antiguo) hay que confirmar que "YYYY-MM-DD" representa una fecha real antes de
// aceptarla — new Date(2024, 1, 30) por ejemplo "rebota" al 1 de marzo en vez de fallar.
export const isValidCalendarDate = (value) => {
  if (!value) return true; // un campo vacío se valida aparte (requerido o no)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
