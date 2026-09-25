import React from "react";
import { Image } from "react-native";

// Ícono circular compacto (usado en Registro, Recuperación de contraseña, etc.).
// Con `full`, muestra el logo completo (con el nombre de la clínica) más grande,
// para las pantallas de login.
const HexLogo = ({ size = 46, full = false }) => {
  if (full) {
    const width = size;
    const height = (size * 936) / 1006;
    return (
      <Image
        source={require("../../assets/logoConsultorioSInFondo.png")}
        style={{ width, height }}
        resizeMode="contain"
      />
    );
  }

  const width = size;
  const height = (size * 508) / 560;

  return (
    <Image
      source={require("../../assets/logoAppSinFondo.png")}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
};

export default HexLogo;
