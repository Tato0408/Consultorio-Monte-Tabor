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
import FormSelect from "../../components/profile/FormSelect";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

import { maskClinicalText } from "../../utils/validation";
const PARENTESCOS = [
  "Madre", "Padre", "Hermano/a", "Abuelo/a materno", "Abuelo/a paterno",
  "Tío/a", "Primo/a", "Hijo/a",
];

const AddHereditaryScreen = ({ navigation }) => {
  const [relationship, setRelationship] = useState("");
  const [condition, setCondition] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap agregue el antecedente dos veces

    const next = {};
    if (!relationship) next.relationship = "Selecciona el parentesco";
    if (!condition.trim()) next.condition = "Escribe la condición o enfermedad";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await apiClient("/patientAccount/me/hereditary", {
        method: "POST",
        body: { relationship, condition: condition.trim() },
      });

      showSuccess("Antecedente agregado.");
      // HealthInfoScreen recarga sola al tomar foco
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo guardar el antecedente.");
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
        <Text style={styles.headerTitle}>Antecedente familiar</Text>
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
          <Text style={styles.sectionTitle}>¿Quién lo padece o lo padeció?</Text>
          <FormSelect
            label="Parentesco"
            value={relationship}
            options={PARENTESCOS}
            placeholder="Seleccionar"
            onChange={(value) => {
              setRelationship(value);
              if (errors.relationship) setErrors((prev) => ({ ...prev, relationship: null }));
            }}
          />
          {errors.relationship ? (
            <Text style={styles.errorText}>{errors.relationship}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Condición o enfermedad</Text>
          <FormInput
            label="Nombre"
            value={condition}
            onChangeText={(value) => {
              setCondition(maskClinicalText(value));
              if (errors.condition) setErrors((prev) => ({ ...prev, condition: null }));
            }}
            placeholder="Ej. Diabetes tipo 2"
            error={errors.condition}
          />

          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Los antecedentes familiares ayudan al médico a identificar riesgos hereditarios.
              Agrega un registro por cada familiar y condición.
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

export default AddHereditaryScreen;