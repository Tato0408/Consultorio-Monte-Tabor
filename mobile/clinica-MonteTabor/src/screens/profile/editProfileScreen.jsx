import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import FormInput from "../../components/profile/FormInput";
import FormSelect from "../../components/profile/FormSelect";
import FormDateInput from "../../components/profile/FormDateInput";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

// Deben coincidir con el enum de gender en el modelo de Mongoose
const GENEROS = ["Masculino", "Femenino", "Otro", "Prefiero no decirlo"];

const EMPTY_FORM = {
  nombres: "",
  apellidos: "",
  dui: "",
  fechaNacimiento: "",
  genero: "",
  telefono: "",
  correo: "",
};

// ISO del backend -> "DD/MM/AAAA" del FormDateInput. Todo en UTC: con la hora local,
// un nacimiento guardado a medianoche se muestra un día antes en El Salvador (UTC-6).
const isoToDisplay = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
};

// "DD/MM/AAAA" -> ISO. Devuelve null si está incompleta, para no mandar "Invalid Date"
const displayToIso = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() || "");
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
};

// API (inglés) -> formulario (español)
const fromApi = (patient) => ({
  nombres: patient?.name || "",
  apellidos: patient?.last_name || "",
  dui: patient?.dui || "",
  fechaNacimiento: isoToDisplay(patient?.birth_date),
  genero: patient?.gender || "",
  telefono: patient?.phone || "",
  correo: patient?.email || "",
});

// Formulario -> API: solo los siete campos que updateMe acepta.
// El DUI vacío se manda como "" porque el controller lo convierte a undefined y lo ignora
// (hay pacientes menores de edad que todavía no tienen DUI).
const toPayload = (form) => ({
  name: form.nombres.trim(),
  last_name: form.apellidos.trim(),
  dui: form.dui.trim(),
  birth_date: displayToIso(form.fechaNacimiento),
  gender: form.genero,
  phone: form.telefono.trim(),
  email: form.correo.trim(),
});

const EditProfileScreen = ({ navigation, route }) => {
  // Si ProfileScreen ya trae el paciente, se pinta de inmediato y se refresca detrás
  const cached = route?.params?.patient;

  const [form, setForm] = useState(cached ? fromApi(cached) : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      // getMe devuelve el paciente directo, sin envolverlo en { data }
      const patient = await apiClient("/patientAccount/me");
      if (patient) setForm(fromApi(patient));
    } catch (error) {
      showError(error.message || "No se pudo cargar tu información.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.nombres.trim()) next.nombres = "Ingresa tus nombres";
    if (!form.apellidos.trim()) next.apellidos = "Ingresa tus apellidos";
    if (!/^\S+@\S+\.\S+$/.test(form.correo)) next.correo = "Correo no válido";
    if (!form.telefono.trim()) next.telefono = "Ingresa un teléfono";
    // El DUI es opcional en el backend, pero si se escribe debe tener el formato correcto
    if (form.dui.trim() && !/^\d{8}-\d$/.test(form.dui.trim())) {
      next.dui = "Formato: 12345678-9";
    }
    if (!form.fechaNacimiento) next.fechaNacimiento = "Ingresa tu fecha de nacimiento";
    else if (!displayToIso(form.fechaNacimiento)) next.fechaNacimiento = "Usa el formato DD/MM/AAAA";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (saving) return; // evita que un doble tap mande dos PUT
    if (!validate()) return;

    setSaving(true);
    try {
      // PUT, no PATCH: patientSelf.js solo registra .put() para /me
      const response = await apiClient("/patientAccount/me", {
        method: "PUT",
        body: toPayload(form),
      });

      // updateMe responde { message, user } con el paciente ya actualizado
      if (response?.user) setForm(fromApi(response.user));

      showSuccess(response?.message || "Tus cambios se guardaron.");
      navigation.goBack(); // ProfileScreen recarga sola al tomar foco
    } catch (error) {
      // 400 también cubre correo o DUI ya registrados en otra cuenta
      showError(error.message || "No se pudieron guardar los cambios.");
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
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Editar Perfil</Text>

        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.headerAction, saving && { opacity: 0.5 }]}>
            {saving ? "..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Información personal</Text>

          <FormInput
            label="Nombres"
            value={form.nombres}
            onChangeText={setField("nombres")}
            error={errors.nombres}
          />
          <FormInput
            label="Apellidos"
            value={form.apellidos}
            onChangeText={setField("apellidos")}
            error={errors.apellidos}
          />
          <FormInput
            label="DUI (opcional)"
            value={form.dui}
            onChangeText={setField("dui")}
            placeholder="12345678-9"
            keyboardType="number-pad"
            error={errors.dui}
          />
          <FormDateInput
            label="Fecha de nacimiento"
            value={form.fechaNacimiento}
            onChange={setField("fechaNacimiento")}
            error={errors.fechaNacimiento}
          />
          <FormSelect
            label="Género"
            value={form.genero}
            options={GENEROS}
            placeholder="Seleccionar"
            onChange={setField("genero")}
          />

          <Text style={styles.sectionTitle}>Información de contacto</Text>

          <FormInput
            label="Teléfono"
            value={form.telefono}
            onChangeText={setField("telefono")}
            keyboardType="phone-pad"
            error={errors.telefono}
          />
          <FormInput
            label="Correo electrónico"
            value={form.correo}
            onChangeText={setField("correo")}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.correo}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;