import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import apiClient from "../../lib/apiClient";
import styles from "../../styles/documents/documentsStyle";

// Colores ya usados en el resto de la app para estos dos tipos de documento
// (incapacidad = azul, receta = verde). El fondo de la insignia queda en pastel.
const TYPES = [
  {
    key: "incapacidad",
    title: "Incapacidades",
    icon: "id-card-outline",
    iconBg: "#EEF3FF",
    accent: "#2F6BFF",
    endpoint: "/patient-portal/sick-leaves",
  },
  {
    key: "receta",
    title: "Recetas",
    icon: "document-text-outline",
    iconBg: "#EAF8F0",
    accent: "#16A34A",
    endpoint: "/patient-portal/prescriptions",
  },
];

// Portada de "Mis documentos" (Perfil > Mis documentos): un encabezado inmersivo con el
// total y dos filas, una por tipo de documento, cada una con su conteo real (mismos
// endpoints que DocumentsListScreen) que llevan a la lista completa de ese tipo.
export default function DocumentsHubScreen({ navigation }) {
  // null = todavía no se sabe (cargando o falló la consulta); nunca se muestra "0" a menos
  // que el conteo real haya llegado, para no dar a entender que no hay documentos cuando en
  // realidad fue un error de red.
  const [counts, setCounts] = useState({ incapacidad: null, receta: null });
  // Tamaño real del encabezado, para pintar el degradado con react-native-svg (ya es
  // dependencia, ver HexLogo) sin traer una librería de gradientes nueva.
  const [bannerSize, setBannerSize] = useState({ width: 0, height: 0 });

  const cargarConteos = useCallback(() => {
    TYPES.forEach((type) => {
      apiClient(type.endpoint)
        .then((data) => setCounts((prev) => ({ ...prev, [type.key]: Array.isArray(data) ? data.length : 0 })))
        .catch(() => setCounts((prev) => ({ ...prev, [type.key]: null })));
    });
  }, []);

  useFocusEffect(useCallback(() => { cargarConteos(); }, [cargarConteos]));

  // Solo se muestra un total cuando ambos conteos llegaron: si uno falló, se cae al texto
  // genérico en vez de dar un número incompleto.
  const total =
    counts.incapacidad != null && counts.receta != null
      ? counts.incapacidad + counts.receta
      : null;

  const bannerSubtitle =
    total != null
      ? `${total} ${total === 1 ? "documento generado" : "documentos generados"} en tus consultas. Elige una categoría para verlos.`
      : "Recetas e incapacidades de todas tus consultas. Elige una categoría para verlos.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis documentos</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.hubContent}>
        {/* Encabezado inmersivo */}
        <View style={styles.banner} onLayout={(e) => setBannerSize(e.nativeEvent.layout)}>
          {bannerSize.width > 0 ? (
            <Svg width={bannerSize.width} height={bannerSize.height} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient
                  id="docHubGrad"
                  x1="0"
                  y1="0"
                  x2={bannerSize.width}
                  y2={bannerSize.height}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor="#2F6BFF" />
                  <Stop offset="0.55" stopColor="#2D8AE0" />
                  <Stop offset="1" stopColor="#17A2B8" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={bannerSize.width} height={bannerSize.height} fill="url(#docHubGrad)" />
            </Svg>
          ) : null}

          <View style={styles.bannerBlob} />

          <View>
            <Text style={styles.bannerEyebrow}>PERFIL · DOCUMENTOS</Text>
            <Text style={styles.bannerTitle}>Tus documentos médicos</Text>
            <Text style={styles.bannerSubtitle}>{bannerSubtitle}</Text>
          </View>
        </View>

        {/* Una fila por tipo de documento */}
        {TYPES.map((type) => {
          const count = counts[type.key];
          const countText = count == null ? "—" : `${count} ${count === 1 ? "documento" : "documentos"}`;
          return (
            <TouchableOpacity
              key={type.key}
              activeOpacity={0.85}
              style={styles.docRow}
              onPress={() => navigation.navigate("DocumentsList", { tipo: type.key })}
            >
              <View style={[styles.docRowIcon, { backgroundColor: type.iconBg }]}>
                <Ionicons name={type.icon} size={21} color={type.accent} />
              </View>
              <View style={styles.docRowTexts}>
                <Text style={styles.docRowTitle}>{type.title}</Text>
                <Text style={styles.docRowCount}>{countText}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
