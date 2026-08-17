import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import EmptyMedications from "../../components/medications/EmptyMedications";
import BottomTabBar from "../../components/medications/BottomTabBar";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const ESTADO_LABEL = { curso: "En curso", finalizado: "Finalizado" };
const ESTADO_TEXT_COLOR = { curso: "#B45309", finalizado: "#64748B" };
const ESTADO_BG_COLOR = { curso: "#FEF3C7", finalizado: "#F1F5F9" };

const parseDurationDays = (duration) => {
  const match = String(duration || "").match(/\d+/);
  return match ? Number(match[0]) : 7;
};

// Igual que en la web: no hay forma de saber si el paciente completó todas las
// dosis, así que un medicamento sigue "en curso" mientras hoy caiga dentro de
// [emitido, emitido + duración]; después se marca "finalizado".
const calcularEstado = (issuedAt, duration) => {
  if (!issuedAt) return "curso";
  const dias = parseDurationDays(duration);
  const inicio = new Date(issuedAt);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + dias);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy < fin ? "curso" : "finalizado";
};

const fmtFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-SV", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const MedicationsScreen = ({ navigation }) => {
  const [hoy, setHoy] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [marcando, setMarcando] = useState(null);

  const loadMedications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(false);

    // allSettled: si el historial falla pero "hoy" carga bien (o viceversa),
    // igual mostramos lo que sí llegó, como en la web.
    // Estos endpoints ya están desplegados en Render, igual que /patientAccount/me
    // en BloodTypeScreen, así que se llaman directo con apiClient (sin servicio aparte).
    const [medsResult, recetasResult] = await Promise.allSettled([
      apiClient("/patient-portal/medications/today"),
      apiClient("/patient-portal/prescriptions"),
    ]);

    if (medsResult.status === "fulfilled") setHoy(medsResult.value || []);
    if (recetasResult.status === "fulfilled") setHistorial(recetasResult.value || []);

    if (medsResult.status === "rejected" || recetasResult.status === "rejected") {
      const ambosFallaron = medsResult.status === "rejected" && recetasResult.status === "rejected";
      setError(ambosFallaron);
      showError("No se pudo cargar toda la información de tus medicamentos.");
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadMedications(); }, [loadMedications]));

  const toggleTomado = async (medicationId, tomadoActual) => {
    if (marcando) return; // evita doble tap mientras ya se está guardando otro
    setMarcando(medicationId);
    const backup = hoy;
    setHoy((prev) =>
      prev.map((m) => (m.medication_id === medicationId ? { ...m, taken: !tomadoActual } : m))
    );
    try {
      await apiClient(`/patient-portal/medications/${medicationId}/taken`, {
        method: "PATCH",
        body: { taken: !tomadoActual },
      });
    } catch (err) {
      setHoy(backup);
      showError(err.message || "No se pudo actualizar el medicamento.");
    } finally {
      setMarcando(null);
    }
  };

  // Aplana las recetas en una fila por medicamento, con su estado ya calculado
  const filasHistorial = useMemo(() => {
    const filas = [];
    historial.forEach((receta) => {
      (receta.medications || []).forEach((m) => {
        filas.push({
          id: `${receta._id}-${m._id}`,
          receta,
          medicamento: m,
          estado: calcularEstado(receta.issued_at, m.duration),
        });
      });
    });
    return filas.sort((a, b) => new Date(b.receta.issued_at) - new Date(a.receta.issued_at));
  }, [historial]);

  const renderHoy = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />;
    }
    if (error) {
      return (
        <EmptyMedications
          icon="cloud-offline-outline"
          title="No pudimos cargar tus medicamentos"
          text="Revisa tu conexión y desliza hacia abajo para volver a intentarlo."
        />
      );
    }
    if (!hoy.length) {
      return (
        <EmptyMedications
          title="No tienes medicamentos programados para hoy"
          text="Cuando tu médico te recete medicamentos, aparecerán aquí."
        />
      );
    }
    return hoy.map((m) => {
      const marcandoEste = marcando === m.medication_id;
      return (
        <View key={m.medication_id} style={localStyles.row}>
          <View style={localStyles.rowInfo}>
            <View style={localStyles.rowIcon}>
              <Ionicons name="medkit-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.rowName} numberOfLines={1}>
                {m.name} {m.dose}
              </Text>
              {m.frequency ? (
                <Text style={localStyles.rowSub} numberOfLines={1}>{m.frequency}</Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={marcandoEste}
            onPress={() => toggleTomado(m.medication_id, m.taken)}
            style={[
              localStyles.pill,
              { backgroundColor: m.taken ? "#D1FAE5" : "#FEF3C7", opacity: marcandoEste ? 0.5 : 1 },
            ]}
          >
            {marcandoEste ? (
              <ActivityIndicator size="small" color={m.taken ? "#059669" : "#D97706"} />
            ) : (
              <Ionicons
                name={m.taken ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={m.taken ? "#059669" : "#D97706"}
              />
            )}
            <Text style={[localStyles.pillText, { color: m.taken ? "#059669" : "#D97706" }]}>
              {m.taken ? "Tomado" : "Pendiente"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  const renderHistorial = () => {
    if (loading) return null;
    if (!filasHistorial.length) {
      return (
        <EmptyMedications
          icon="document-text-outline"
          title="Todavía no tienes recetas registradas"
          text="Cuando tu médico registre una receta, aparecerá en tu historial."
        />
      );
    }
    return filasHistorial.map((fila) => (
      <View key={fila.id} style={localStyles.historyRow}>
        <View style={localStyles.rowInfo}>
          <View style={[localStyles.rowIcon, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="medkit-outline" size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.rowName} numberOfLines={1}>
              {fila.medicamento.name} {fila.medicamento.dose}
            </Text>
            <Text style={localStyles.rowSub} numberOfLines={1}>
              {fila.medicamento.frequency}
              {fila.receta.doctor
                ? ` · Dr(a). ${fila.receta.doctor.name} ${fila.receta.doctor.last_name}`
                : ""}
            </Text>
            <Text style={localStyles.rowSub}>{fmtFecha(fila.receta.issued_at)}</Text>
          </View>
        </View>

        <View style={[localStyles.statusChip, { backgroundColor: ESTADO_BG_COLOR[fila.estado] }]}>
          <Text style={[localStyles.statusChipText, { color: ESTADO_TEXT_COLOR[fila.estado] }]}>
            {ESTADO_LABEL[fila.estado]}
          </Text>
        </View>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Recordatorios de Medicina
        </Text>

        <TouchableOpacity style={styles.headerSide} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMedications({ silent: true }); }}
          />
        }
      >
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Medicamentos de hoy</Text>
        </View>

        {renderHoy()}

        <View style={[styles.sectionRow, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>Historial de recetas</Text>
        </View>

        {renderHistorial()}
      </ScrollView>

      {/* Sin onFabPress: ya no existe la opción de que el paciente agregue medicamentos */}
      <BottomTabBar
        active="medications"
        onPress={(key) => console.log("Tab:", key)}
      />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rowName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  rowSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
});

export default MedicationsScreen;