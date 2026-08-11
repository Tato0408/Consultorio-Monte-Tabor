/** "12/03/1996" -> Date */
export const parseDate = (str) => {
  if (!str) return new Date(2000, 0, 1);
  const [d, m, y] = str.split("/").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return isNaN(date.getTime()) ? new Date(2000, 0, 1) : date;
};

/** Date -> "12/03/1996" */
export const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Se arma a mano en vez de usar toLocaleDateString: el resto del proyecto ya evita depender
// de Intl en el motor de RN (ver este mismo archivo), así que se mantiene la misma cautela acá.
// Usa los getters UTC (no los locales): el backend guarda "date" como medianoche UTC del día
// de la cita, sin componente horaria propia (la hora vive aparte en start_time/end_time). Leerla
// con getDate()/getMonth() locales corre el día un día atrás en cualquier dispositivo con huso
// horario detrás de UTC (todo Latinoamérica), mostrando "15 Mayo" para una cita del 16.
/** ISO/Date -> "16 Mayo 2024" (null-safe) */
export const formatLongDate = (input) => {
  if (!input) return "";
  const date = new Date(input);
  if (isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${MONTHS_ES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/** "14:30" -> "02:30 PM" (null-safe, tolera formato ya en 12h) */
export const formatTime12h = (time) => {
  if (!time) return "";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};