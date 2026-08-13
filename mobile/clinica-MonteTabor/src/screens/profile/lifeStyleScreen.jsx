import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

const MAX = 300;

const LifestyleScreen = ({ navigation, route }) => {
  // Si HealthInfoScreen ya trae el paciente se pinta de inmediato y se refresca detrás
  const cached = route?.params?.patient?.clinical_history;

  const [lifestyle, setLifestyle] = useState(cached?.non_pathological || "");
  const [environment, setEnvironment] = useState(cached?.ecologycal_social || "");
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      // getMe devuelve el paciente directo, sin envolverlo en { data }
      const patient = await apiClient("/patientAccount/me");
      setLifestyle(patient?.clinical_history?.non_pathological || "");
      setEnvironment(patient?.clinical_history?.ecologycal_social || "");
    } catch (error) {
      showError(error.message || "No se pudo cargar tu información.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap mande dos PUT

    setSaving(true);
    try {
      // Se mandan siempre los dos: el backend acepta la cadena vacía como "borrar"
      await apiClient("/patientAccount/me/lifestyle", {
        method: "PUT",
        body: {
          non_pathological: lifestyle.trim(),
          ecologycal_social: environment.trim(),
        },
      });

      showSuccess("Información guardada.");
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo guardar tu información.");
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>Estilo de vida</Text>
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
          <Text style={styles.sectionTitle}>Hábitos</Text>
          <Text style={styles.sectionSubtitle}>
            Tabaco, alcohol, alimentación, ejercicio y horas de sueño.
          </Text>
          <TextInput
            style={styles.textArea}
            value={lifestyle}
            onChangeText={(value) => value.length <= MAX && setLifestyle(value)}
            placeholder="Ej. No fumo, camino 30 minutos al día, dieta balanceada."
            placeholderTextColor={colors.muted}
            multiline
          />
          <Text style={styles.counter}>{lifestyle.length}/{MAX}</Text>

          <Text style={styles.sectionTitle}>Entorno y vivienda</Text>
          <Text style={styles.sectionSubtitle}>
            Tipo de vivienda, agua potable, saneamiento, animales y personas con las que vives.
          </Text>
          <TextInput
            style={styles.textArea}
            value={environment}
            onChangeText={(value) => value.length <= MAX && setEnvironment(value)}
            placeholder="Ej. Casa de sistema mixto, agua potable, vivo con 3 personas y un perro."
            placeholderTextColor={colors.muted}
            multiline
          />
          <Text style={styles.counter}>{environment.length}/{MAX}</Text>

          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Estos datos forman parte de tus antecedentes no patológicos y ayudan al médico
              a entender tu contexto de salud.
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

export default LifestyleScreen;