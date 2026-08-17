import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import FormInput from "../../components/profile/FormInput";
import FormDateInput from "../../components/profile/FormDateInput";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

// "DD/MM/AAAA" -> ISO en UTC, para que la fecha no se corra un día en El Salvador (UTC-6)
const displayToIso = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() || "");
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
};

const AddPathologicalScreen = ({ navigation }) => {
  const [disease, setDisease] = useState("");
  const [fecha, setFecha] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap agregue la enfermedad dos veces

    const next = {};
    if (!disease.trim()) next.disease = "Escribe el nombre de la enfermedad";

    // La fecha es opcional: mucha gente no recuerda cuándo la diagnosticaron
    const iso = fecha ? displayToIso(fecha) : null;
    if (fecha && !iso) next.fecha = "Usa el formato DD/MM/AAAA";
    else if (iso && new Date(iso) > new Date()) next.fecha = "La fecha no puede ser futura";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await apiClient("/patientAccount/me/pathological", {
        method: "POST",
        body: { disease: disease.trim(), diagnosis: iso },
      });

      showSuccess("Enfermedad agregada.");
      // HealthInfoScreen recarga sola al tomar foco
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo guardar la enfermedad.");
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>Enfermedad crónica</Text>
        <View style={styles.headerSide} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>¿Qué enfermedad tienes?</Text>
          <FormInput
            label="Nombre"
            value={disease}
            onChangeText={(value) => {
              setDisease(value);
              if (errors.disease) setErrors((prev) => ({ ...prev, disease: null }));
            }}
            placeholder="Ej. Hipertensión arterial"
            error={errors.disease}
          />

          <Text style={styles.sectionTitle}>Fecha de diagnóstico</Text>
          <Text style={styles.sectionSubtitle}>
            Opcional. Déjala vacía si no la recuerdas.
          </Text>
          <FormDateInput
            value={fecha}
            onChange={(value) => {
              setFecha(value);
              if (errors.fecha) setErrors((prev) => ({ ...prev, fecha: null }));
            }}
            error={errors.fecha}
          />

          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Registra solo condiciones diagnosticadas por un médico. Esta información se
              muestra al personal de la clínica durante tus consultas.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddPathologicalScreen;