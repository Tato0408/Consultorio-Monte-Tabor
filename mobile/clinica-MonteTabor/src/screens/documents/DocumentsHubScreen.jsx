import React, { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../lib/apiClient";
import styles from "../../styles/documents/documentsStyle";

// Colores pastel ya usados en el resto de la app para estos mismos dos tipos de documento
// (ver badgeTones en styles/appointments/appointmentsStyle.js: receta = azul, incapacidad ya
// era azul aquí y se mantiene) — solo se suaviza el tono a pastel, no se inventa paleta nueva.
const TYPES = [
  {
    key: "incapacidad",
    title: "Incapacidades",
    subtitle: "Todas tus constancias de incapacidad médica",
    icon: "id-card-outline",
    statIcon: "document-outline",
    linkLabel: "Ver mis incapacidades",
    cardBg: "#EEF3FF",
    cardBorder: "#DCE6FF",
    iconBg: "#DCE8FF",
    accent: "#2F6BFF",
    endpoint: "/patient-portal/sick-leaves",
  },
  {
    key: "receta",
    title: "Recetas",
    subtitle: "Todas tus recetas médicas emitidas",
    icon: "document-text-outline",
    statIcon: "medkit-outline",
    linkLabel: "Ver mis recetas",
    cardBg: "#EAF8F0",
    cardBorder: "#CDEDDC",
    iconBg: "#D2F0DF",
    accent: "#16A34A",
    endpoint: "/patient-portal/prescriptions",
  },
];

// Portada de "Mis documentos" (Perfil > Mis documentos): dos cards, una por tipo de
// documento, cada una con su conteo real (mismos endpoints que DocumentsListScreen) y un
// link a la lista completa de ese tipo, de todas las consultas.
export default function DocumentsHubScreen({ navigation }) {
  // null = todavía no se sabe (cargando o falló la consulta); nunca se muestra "0" a menos
  // que el conteo real haya llegado, para no dar a entender que no hay documentos cuando en
  // realidad fue un error de red.
  const [counts, setCounts] = useState({ incapacidad: null, receta: null });

  const cargarConteos = useCallback(() => {
    TYPES.forEach((type) => {
      apiClient(type.endpoint)
        .then((data) => setCounts((prev) => ({ ...prev, [type.key]: Array.isArray(data) ? data.length : 0 })))
        .catch(() => setCounts((prev) => ({ ...prev, [type.key]: null })));
    });
  }, []);

  useFocusEffect(useCallback(() => { cargarConteos(); }, [cargarConteos]));

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
        {TYPES.map((type) => {
          const count = counts[type.key];
          return (
            <TouchableOpacity
              key={type.key}
              activeOpacity={0.85}
              style={[styles.docTypeCard, { backgroundColor: type.cardBg, borderColor: type.cardBorder }]}
              onPress={() => navigation.navigate("DocumentsList", { tipo: type.key })}
            >
              <View style={[styles.docTypeIconWrap, { backgroundColor: type.iconBg }]}>
                <Ionicons name={type.icon} size={22} color={type.accent} />
              </View>
              <Text style={styles.docTypeTitle}>{type.title}</Text>
              <Text style={styles.docTypeSubtitle}>{type.subtitle}</Text>

              <View style={styles.docTypeStatsRow}>
                <View>
                  <Text style={styles.docTypeStatsLabel}>Documentos</Text>
                  <Text style={styles.docTypeStatsValue}>{count === null ? "—" : count}</Text>
                </View>
                <View style={styles.docTypeStatsIconWrap}>
                  <Ionicons name={type.statIcon} size={17} color={type.accent} />
                </View>
              </View>

              <View style={styles.docTypeLinkRow}>
                <Text style={[styles.docTypeLinkText, { color: type.accent }]}>{type.linkLabel}</Text>
                <Ionicons name="chevron-forward" size={15} color={type.accent} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
