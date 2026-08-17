import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import StepIndicator from "../../components/medications/StepIndicator";
import RadioGroup from "../../components/medications/RadioGroup";
import TimeField from "../../components/medications/TimeField";
import IconPickerModal, { ICON_OPTIONS } from "../../components/medications/IconPickerModal";
import FormSelect from "../../components/profile/FormSelect";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import styles, { pillTint } from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const STEPS = ["Medicamento", "Horario", "Duración", "Resumen"];

const FORMAS = ["Tableta", "Cápsula", "Jarabe", "Inyección", "Gotas", "Crema", "Inhalador"];

const FRECUENCIAS = [
  { value: "6",     label: "Cada 6 horas" },
  { value: "8",     label: "Cada 8 horas" },
  { value: "12",    label: "Cada 12 horas" },
  { value: "24",    label: "Cada 24 horas" },
  { value: "other", label: "Otra frecuencia" },
];

const EMPTY_FORM = {
  nombre: "",
  dosis: "",
  forma: "",
  icon: ICON_OPTIONS[0].icon,
  color: ICON_OPTIONS[0].color,
  frecuencia: "",
  horas: [""],
  dias: "",
};

// El formulario está en español y la API en inglés: la traducción vive solo aquí
const buildPayload = (form) => ({
  name: form.nombre.trim(),
  dose: form.dosis.trim(),
  form: form.forma || null,
  icon: form.icon,
  color: form.color,
  frequency_hours: form.frecuencia === "other" ? null : Number(form.frecuencia),
  times: form.horas.map((hora) => hora?.trim()).filter(Boolean),
  duration_days: form.dias ? Number(form.dias) : null,
});

const AddMedicationScreen = ({ navigation }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [iconModal, setIconModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const setHora = (index) => (value) =>
    setForm((prev) => {
      const horas = [...prev.horas];
      horas[index] = value;
      return { ...prev, horas };
    });

  const addHora = () =>
    setForm((prev) => ({ ...prev, horas: [...prev.horas, ""] }));

  const removeHora = (index) =>
    setForm((prev) => ({
      ...prev,
      horas: prev.horas.filter((_, i) => i !== index),
    }));

  const validate = () => {
    const next = {};
    if (!form.nombre.trim()) next.nombre = "Ingresa el nombre del medicamento";
    if (!form.dosis.trim()) next.dosis = "Ingresa la dosis";
    if (!form.frecuencia) next.frecuencia = "Selecciona una frecuencia";
    if (!form.horas.some((hora) => hora?.trim())) next.horas = "Agrega al menos una hora";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async () => {
    if (saving) return; // un doble tap crearía dos medicamentos
    if (!validate()) return;

    setSaving(true);
    try {
      await apiClient("/medications", { method: "POST", body: buildPayload(form) });
      navigation.navigate("Medications"); // la lista se recarga sola al tomar foco
    } catch (error) {
      showError(error.message || "No se pudo guardar el medicamento.");
    } finally {
      setSaving(false);
    }
  };

  const tint = pillTint[form.color] || pillTint.blue;

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
        <Text style={styles.headerTitle}>Agregar medicamento</Text>
        <View style={styles.headerSide} />
      </View>

      <StepIndicator steps={STEPS} current={1} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- Información ---------- */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Información del medicamento</Text>

            <View style={styles.rowWithIcon}>
              <View style={styles.rowFields}>
                <View style={styles.field}>
                  <Text style={styles.label}>Nombre del medicamento</Text>
                  <TextInput
                    style={[styles.input, errors.nombre && styles.inputError]}
                    value={form.nombre}
                    onChangeText={setField("nombre")}
                    placeholder="Ej. Losartán"
                    placeholderTextColor={colors.muted}
                  />
                  {errors.nombre ? (
                    <Text style={styles.errorText}>{errors.nombre}</Text>
                  ) : null}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Dosis</Text>
                  <TextInput
                    style={[styles.input, errors.dosis && styles.inputError]}
                    value={form.dosis}
                    onChangeText={setField("dosis")}
                    placeholder="Ej. 50 mg"
                    placeholderTextColor={colors.muted}
                  />
                  {errors.dosis ? (
                    <Text style={styles.errorText}>{errors.dosis}</Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={styles.iconPicker}
                activeOpacity={0.7}
                onPress={() => setIconModal(true)}
              >
                <View style={[styles.iconPickerCircle, { backgroundColor: tint.bg }]}>
                  <Ionicons name={form.icon} size={19} color={tint.fg} />
                </View>
                <Text style={styles.iconPickerText}>Cambiar{"\n"}ícono</Text>
              </TouchableOpacity>
            </View>

            <FormSelect
              label="Forma farmacéutica"
              value={form.forma}
              options={FORMAS}
              placeholder="Seleccionar"
              onChange={setField("forma")}
            />
          </View>

          {/* ---------- Frecuencia ---------- */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Frecuencia</Text>
            <Text style={styles.formSubtitle}>¿Cada cuánto lo tomarás?</Text>

            <RadioGroup
              options={FRECUENCIAS}
              value={form.frecuencia}
              onChange={setField("frecuencia")}
            />
            {errors.frecuencia ? (
              <Text style={styles.errorText}>{errors.frecuencia}</Text>
            ) : null}
          </View>

          {/* ---------- Horario ---------- */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Horario</Text>
            <Text style={styles.formSubtitle}>
              Selecciona las horas en que tomarás tu medicamento
            </Text>

            {form.horas.map((hora, index) => (
              <TimeField
                key={index}
                label={`Hora ${index + 1}`}
                value={hora}
                onChange={(value) => {
                  setHora(index)(value);
                  if (errors.horas) setErrors((prev) => ({ ...prev, horas: null }));
                }}
                onRemove={form.horas.length > 1 ? () => removeHora(index) : undefined}
              />
            ))}

            {errors.horas ? (
              <Text style={styles.errorText}>{errors.horas}</Text>
            ) : null}

            <TouchableOpacity style={styles.addTime} activeOpacity={0.7} onPress={addHora}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addTimeText}>Agregar otra hora</Text>
            </TouchableOpacity>
          </View>

          {/* ---------- Duración ---------- */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Duración del tratamiento</Text>
            <Text style={styles.formSubtitle}>¿Por cuántos días lo tomarás?</Text>

            <View style={styles.durationRow}>
              <TextInput
                style={[styles.input, styles.durationInput, { paddingRight: 50 }]}
                value={form.dias}
                onChangeText={setField("dias")}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
              />
              <Text style={styles.durationSuffix}>días</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar medicamento</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <IconPickerModal
        visible={iconModal}
        value={form.icon}
        onClose={() => setIconModal(false)}
        onSelect={(option) =>
          setForm((prev) => ({ ...prev, icon: option.icon, color: option.color }))
        }
      />
    </SafeAreaView>
  );
};

export default AddMedicationScreen;