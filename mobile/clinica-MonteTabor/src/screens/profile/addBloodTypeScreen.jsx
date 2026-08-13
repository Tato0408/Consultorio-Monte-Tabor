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

import FormDateInput from "../../components/profile/FormDateInput";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/bloodTypeStyle";
import { colors } from "../../styles/profile/profileStyle";

// Mismo orden que el mockup. Debe coincidir con BLOOD_TYPES del controller
const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// "DD/MM/AAAA" -> ISO en UTC, para que la fecha no se corra un día en El Salvador (UTC-6)
const displayToIso = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() || "");
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
};

const todayDisplay = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${now.getFullYear()}`;
};

const AddBloodTypeScreen = ({ navigation, route }) => {
  // Si ya tenía uno registrado llega por params y queda preseleccionado
  const [selected, setSelected] = useState(route?.params?.current || "");
  const [fecha, setFecha] = useState(todayDisplay());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap mande dos PUT

    const next = {};
    if (!selected) next.tipo = "Selecciona tu tipo de sangre";
    const iso = displayToIso(fecha);
    if (fecha && !iso) next.fecha = "Usa el formato DD/MM/AAAA";
    else if (iso && new Date(iso) > new Date()) next.fecha = "La fecha no puede ser futura";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await apiClient("/patientAccount/me/blood-type", {
        method: "PUT",
        body: { blood_type: selected, blood_type_date: iso },
      });

      showSuccess("Tipo de sangre guardado.");
      // goBack y no navigate: BloodTypeScreen recarga sola al tomar foco y ya
      // muestra la vista de consulta con el dato nuevo
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo guardar tu tipo de sangre.");
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
        <Text style={styles.headerTitle}>Agregar tipo de sangre</Text>
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
          <View style={styles.hero}>
            <View style={styles.dropCircle}>
              <Ionicons name="water" size={38} color="#DC2626" />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Selecciona tu tipo de sangre</Text>

          <View style={styles.typeGrid}>
            {BLOOD_TYPES.map((type) => {
              const active = selected === type;
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.8}
                  style={[styles.typeOption, active && styles.typeOptionActive]}
                  onPress={() => {
                    setSelected(type);
                    if (errors.tipo) setErrors((prev) => ({ ...prev, tipo: null }));
                  }}
                >
                  <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {errors.tipo ? <Text style={styles.errorText}>{errors.tipo}</Text> : null}

          <Text style={styles.sectionTitle}>Fecha del registro</Text>
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
              Esta información es vital en caso de emergencias médicas. Confírmala con un
              examen de laboratorio antes de registrarla.
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

export default AddBloodTypeScreen;