// Paleta de colores para las gráficas de barras (interfaz y PDF de
// reportes). Los primeros cuatro colores son los mismos tonos que usa la
// pantalla de control de roles (rolesConfig.js, ROLE_COLOR_TOKENS,
// propiedad solidBg): admin en azul, doctor en violeta, nurse en
// esmeralda y receptionist en rosa. El resto son colores nuevos con la
// misma saturación y luminosidad, para mantener la misma estética cuando
// una gráfica tiene más de cuatro barras.
export const CHART_PALETTE = [
  // Azul, el mismo que usa el rol admin.
  "#3B6FCA",
  // Violeta, el mismo que usa el rol doctor.
  "#7C4FD1",
  // Esmeralda, el mismo que usa el rol nurse.
  "#1E9E63",
  // Rosa, el mismo que usa el rol receptionist.
  "#D44C68",
  // Ámbar.
  "#D6A23A",
  // Teal.
  "#2FA0A0",
  // Naranja.
  "#DB7F42",
  // Magenta.
  "#C14FA0",
];

// Devuelve el color de la paleta correspondiente al índice dado,
// reiniciando el ciclo cuando el índice supera la cantidad de colores
// disponibles.
export const chartColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];
