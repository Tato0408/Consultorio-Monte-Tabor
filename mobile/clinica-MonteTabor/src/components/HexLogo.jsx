import React from "react";
import { View, Text, Platform } from "react-native";
import Svg, { Polygon } from "react-native-svg";

// Mismo hexágono que usa la web (Login.jsx, Recovery, NotFound.jsx, etc.):
// viewBox 56x64 con el polígono "28,2 54,17 54,47 28,62 2,47 2,17" y relleno #3B6FCA.
// Antes esto era un cuadrado con las esquinas redondeadas — esta es la forma real.
const HexLogo = ({ size = 46, letter = "T", color = "#3B6FCA" }) => {
  const width = size;
  const height = (size * 64) / 56;

  return (
    <View
      style={{
        width,
        height,
        alignItems: "center",
        justifyContent: "center",
        ...(Platform.OS === "ios"
          ? { shadowColor: color, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
          : { elevation: 4 }),
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 56 64" style={{ position: "absolute" }}>
        <Polygon points="28,2 54,17 54,47 28,62 2,47 2,17" fill={color} />
      </Svg>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.41 }}>{letter}</Text>
    </View>
  );
};

export default HexLogo;
