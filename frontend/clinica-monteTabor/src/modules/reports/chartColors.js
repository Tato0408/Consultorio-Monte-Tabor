// Paleta de colores para gráficas de barras (UI + PDF de reportes). Los primeros 4 son
// exactamente los mismos tonos pastel que ya usa la interfaz de "Control de roles"
// (rolesConfig.js -> ROLE_COLOR_TOKENS.*.solidBg: admin=azul, doctor=violeta, nurse=esmeralda,
// receptionist=rosa). El resto son colores nuevos con la misma saturación/luminosidad para
// mantener la misma estética cuando una gráfica tiene más de 4 barras.
export const CHART_PALETTE = [
  "#3B6FCA", // azul   (admin)
  "#7C4FD1", // violeta (doctor)
  "#1E9E63", // esmeralda (nurse)
  "#D44C68", // rosa   (receptionist)
  "#D6A23A", // ámbar
  "#2FA0A0", // teal
  "#DB7F42", // naranja
  "#C14FA0", // magenta
];

export const chartColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];
