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
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

import { maskClinicalText } from "../../utils/validation";
// El diagnóstico es texto libre corto (ej. "Confirmado en 2019"), no una
// fecha: se guarda tal cual como string.
const DIAGNOSIS_MAX = 50;

const AddPathologicalScreen = ({ navigation }) => {
  const [disease, setDisease] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap agregue la enfermedad dos veces

    const next = {};
    if (!disease.trim()) next.disease = "Escribe el nombre de la enfermedad";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await apiClient("/patientAccount/me/pathological", {
        method: "POST",
        body: { disease: disease.trim(), diagnosis: diagnosis.trim() || null },
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
              setDisease(maskClinicalText(value));
              if (errors.disease) setErrors((prev) => ({ ...prev, disease: null }));
            }}
            placeholder="Ej. Hipertensión arterial"
            error={errors.disease}
          />

          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          <Text style={styles.sectionSubtitle}>
            Opcional. Máximo {DIAGNOSIS_MAX} caracteres.
          </Text>
          <FormInput
            label="Diagnóstico"
            value={diagnosis}
            onChangeText={(value) => setDiagnosis(maskClinicalText(value).slice(0, DIAGNOSIS_MAX))}
            placeholder="Ej. Confirmado en 2019"
            maxLength={DIAGNOSIS_MAX}
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