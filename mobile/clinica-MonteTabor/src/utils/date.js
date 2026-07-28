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