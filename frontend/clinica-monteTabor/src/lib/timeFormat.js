// Formato único de hora para todo el portal privado: "14:30" -> "2:30 PM".
// null-safe y tolera un valor que ya venga en 12h (o cualquier cosa que no
// calce el patrón "HH:mm", lo devuelve tal cual).
export const formatTime12h = (time) => {
  if (!time) return "";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
};
