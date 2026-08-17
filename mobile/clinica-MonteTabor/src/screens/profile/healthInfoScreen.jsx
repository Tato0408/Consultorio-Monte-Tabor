import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-GT", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      })
    : null;

const SectionHeader = ({ title, onAdd }) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionRowTitle}>{title}</Text>
    {onAdd ? (
      <TouchableOpacity style={styles.addLink} activeOpacity={0.7} onPress={onAdd}>
        <Ionicons name="add" size={15} color={colors.primary} />
        <Text style={styles.addLinkText}>Agregar</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const EmptyRow = ({ text }) => (
  <View style={styles.emptyRow}>
    <Text style={styles.emptyRowText}>{text}</Text>
  </View>
);

const HealthInfoScreen = ({ navigation }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      // getMe devuelve el paciente directo, sin envolverlo en { data }
      const response = await apiClient("/patientAccount/me");
      setPatient(response || null);
    } catch (error) {
      showError(error.message || "No se pudo cargar tu historia clínica.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Al volver de cualquier formulario la lista se refresca sola
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const history = patient?.clinical_history;

  // Borrado optimista: se quita de la lista al instante y se restaura si el DELETE falla
  const removeEntry = (kind, entry, label) => {
    Alert.alert("Eliminar registro", `Se eliminará "${label}".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const backup = patient;
          setPatient((prev) => ({
            ...prev,
            clinical_history: {
              ...prev.clinical_history,
              [kind]: prev.clinical_history[kind].filter((item) => item._id !== entry._id),
            },
          }));
          try {
            await apiClient(`/patientAccount/me/${kind}/${entry._id}`, { method: "DELETE" });
          } catch (error) {
            setPatient(backup);
            showError(error.message || "No se pudo eliminar el registro.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Historia clínica</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadProfile({ silent: true }); }}
          />
        }
      >
        {/* ---------- Tipo de sangre ---------- */}
        <SectionHeader title="Tipo de sangre" />
        <TouchableOpacity
          style={styles.listItem}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("BloodType")}
        >
          <View style={[styles.listIcon, { backgroundColor: "#FEE8E8" }]}>
            <Ionicons name="water" size={18} color="#DC2626" />
          </View>
          <View style={styles.listTexts}>
            <Text style={styles.listTitle}>
              {history?.blood_type || "Sin registrar"}
            </Text>
            <Text style={styles.listMeta}>
              {history?.blood_type ? "Ver compatibilidad" : "Tocar para registrarlo"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* ---------- Enfermedades crónicas ---------- */}
        <SectionHeader
          title="Enfermedades crónicas"
          onAdd={() => navigation.navigate("AddPathological")}
        />
        {history?.pathological?.length ? (
          history.pathological.map((item) => (
            <View key={item._id} style={styles.listItem}>
              <View style={styles.listIcon}>
                <Ionicons name="pulse-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.listTexts}>
                <Text style={styles.listTitle}>{item.disease}</Text>
                {dateLabel(item.diagnosis) ? (
                  <Text style={styles.listMeta}>Diagnóstico: {dateLabel(item.diagnosis)}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.listRemove}
                activeOpacity={0.7}
                onPress={() => removeEntry("pathological", item, item.disease)}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <EmptyRow text="No has registrado enfermedades crónicas." />
        )}

        {/* ---------- Antecedentes familiares ---------- */}
        <SectionHeader
          title="Antecedentes familiares"
          onAdd={() => navigation.navigate("AddHereditary")}
        />
        {history?.hereditary?.length ? (
          history.hereditary.map((item) => (
            <View key={item._id} style={styles.listItem}>
              <View style={styles.listIcon}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.listTexts}>
                <Text style={styles.listTitle}>{item.condition}</Text>
                <Text style={styles.listMeta}>{item.relationship}</Text>
              </View>
              <TouchableOpacity
                style={styles.listRemove}
                activeOpacity={0.7}
                onPress={() => removeEntry("hereditary", item, item.condition)}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <EmptyRow text="No has registrado antecedentes familiares." />
        )}

        {/* ---------- Estilo de vida y entorno ---------- */}
        <SectionHeader title="Estilo de vida y entorno" />
        <TouchableOpacity
          style={styles.listItem}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Lifestyle", { patient })}
        >
          <View style={styles.listIcon}>
            <Ionicons name="leaf-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.listTexts}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {history?.non_pathological || "Sin registrar"}
            </Text>
            <Text style={styles.listMeta} numberOfLines={1}>
              {history?.ecologycal_social || "Tocar para completar"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* ---------- Procedimientos (solo lectura) ---------- */}
        <SectionHeader title="Procedimientos" />
        {history?.procedures?.length ? (
          history.procedures.map((item, index) => (
            <View key={item._id || index} style={styles.listItem}>
              <View style={styles.listIcon}>
                <Ionicons name="medkit-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.listTexts}>
                <Text style={styles.listTitle}>{item.procedure_name}</Text>
                <Text style={styles.listMeta}>
                  {[dateLabel(item.date), item.doctor_name].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyRow text="Aún no tienes procedimientos registrados." />
        )}

        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={styles.noticeText}>
            Los procedimientos y los signos vitales los registra el personal de la clínica
            durante tus consultas, por eso no puedes editarlos aquí.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthInfoScreen;