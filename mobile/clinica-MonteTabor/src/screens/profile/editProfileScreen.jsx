import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import FormInput from "../../components/profile/FormInput";
import FormSelect from "../../components/profile/FormSelect";
import FormDateInput from "../../components/profile/FormDateInput";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import { displayToIso } from "../../utils/date";
import { NAME_REGEX, PHONE_REGEX, DUI_REGEX, maskName, maskDui, maskPhone } from "../../utils/validation";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

// Mismos valores que acepta el backend (GENEROS_VALIDOS en
// patientSelfController.js): solo Masculino o Femenino.
const GENEROS = ["Masculino", "Femenino"];

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


// API (inglés) -> formulario (español)
const fromApi = (patient) => ({
  nombres: patient?.name || "",
  apellidos: patient?.last_name || "",
  dui: patient?.dui || "",
  fechaNacimiento: isoToDisplay(patient?.birth_date),
  // Un valor guardado antes que ya no es válido ("Otro") queda vacío para
  // obligar a elegir Masculino o Femenino.
  genero: GENEROS.includes(patient?.gender) ? patient.gender : "",
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
  // Se muestra cuando updateMe responde pendingEmailVerification: el correo
  // nuevo todavía no se aplicó, hace falta el código que se mandó a esa
  // bandeja (ver patientSelfController.updateMe/verifyEmailChange).
  const [emailCodeModal, setEmailCodeModal] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

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

  // Igual que setField, pero bloqueando números y caracteres especiales mientras se
  // escribe (nombres y apellidos son el único caso que lo necesita en este formulario).
  const setNameField = (key) => (value) => setField(key)(maskName(value));

  // Mismas máscaras que RegisterScreen: solo dígitos, con guión automático.
  const handleDuiChange = (value) => setField("dui")(maskDui(value));
  const handlePhoneChange = (value) => setField("telefono")(maskPhone(value));

  const validate = () => {
    const next = {};
    if (!form.nombres.trim()) next.nombres = "Ingresa tus nombres";
    else if (!NAME_REGEX.test(form.nombres.trim())) next.nombres = "Solo letras, sin números ni símbolos";
    if (!form.apellidos.trim()) next.apellidos = "Ingresa tus apellidos";
    else if (!NAME_REGEX.test(form.apellidos.trim())) next.apellidos = "Solo letras, sin números ni símbolos";
    if (!/^\S+@\S+\.\S+$/.test(form.correo)) next.correo = "Correo no válido";
    if (!form.telefono.trim()) next.telefono = "Ingresa un teléfono";
    else if (!PHONE_REGEX.test(form.telefono.trim())) next.telefono = "Formato: 7890-7890";
    // El DUI es opcional en el backend, pero si se escribe debe tener el formato correcto
    if (form.dui.trim() && !DUI_REGEX.test(form.dui.trim())) {
      next.dui = "Formato: 12345678-9";
    }
    if (!GENEROS.includes(form.genero)) next.genero = "Selecciona Masculino o Femenino";
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
      // (el correo, si cambió, sigue siendo el anterior hasta confirmarlo).
      if (response?.user) setForm(fromApi(response.user));

      if (response?.pendingEmailVerification) {
        showSuccess("Tus datos se guardaron. Revisa tu nuevo correo para confirmar el cambio.");
        setEmailCode("");
        setEmailCodeModal(true);
        return; // no cierra la pantalla todavía: falta confirmar el código
      }

      showSuccess(response?.message || "Tus cambios se guardaron.");
      navigation.goBack(); // ProfileScreen recarga sola al tomar foco
    } catch (error) {
      // 400 también cubre correo o DUI ya registrados en otra cuenta
      showError(error.message || "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (verifyingCode || !emailCode.trim()) return;
    setVerifyingCode(true);
    try {
      const response = await apiClient("/patientAccount/verifyEmailChange", {
        method: "PUT",
        body: { verificationCodeRequest: emailCode.trim() },
      });
      if (response?.user) setForm(fromApi(response.user));
      showSuccess(response?.message || "Correo actualizado y verificado.");
      setEmailCodeModal(false);
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo confirmar el código.");
    } finally {
      setVerifyingCode(false);
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
            onChangeText={setNameField("nombres")}
            error={errors.nombres}
          />
          <FormInput
            label="Apellidos"
            value={form.apellidos}
            onChangeText={setNameField("apellidos")}
            error={errors.apellidos}
          />
          <FormInput
            label="DUI (opcional)"
            value={form.dui}
            onChangeText={handleDuiChange}
            placeholder="12345678-9"
            keyboardType="number-pad"
            maxLength={10}
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
            error={errors.genero}
          />

          <Text style={styles.sectionTitle}>Información de contacto</Text>

          <FormInput
            label="Teléfono"
            value={form.telefono}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={9}
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

      <Modal visible={emailCodeModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirma tu nuevo correo</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>
              Te enviamos un código a {form.correo}. Ingrésalo para terminar de aplicar el cambio.
            </Text>
            <TextInput
              value={emailCode}
              onChangeText={setEmailCode}
              placeholder="Código de verificación"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: colors.border || "#e2e8f0",
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                fontSize: 16,
                textAlign: "center",
                letterSpacing: 2,
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={handleVerifyEmailCode}
              disabled={verifyingCode || !emailCode.trim()}
            >
              {verifyingCode ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.modalOptionText, { color: colors.primary, fontWeight: "600" }]}>
                  Confirmar correo
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={() => {
                setEmailCodeModal(false);
                navigation.goBack();
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.muted }]}>
                Confirmar después
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditProfileScreen;