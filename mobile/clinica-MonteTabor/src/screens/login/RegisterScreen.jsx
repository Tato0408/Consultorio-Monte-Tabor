import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import FormInput from "../../components/profile/FormInput";
import FormSelect from "../../components/profile/FormSelect";
import FormDateInput from "../../components/profile/FormDateInput";
import styles from "../../styles/loginStyle";
import formStyles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../lib/toast";
import { EMAIL_REGEX, PHONE_REGEX, DUI_REGEX, maskDui, maskPhone, toISODate, getPasswordError } from "../../utils/validation";

const GENDER_OPTIONS = ["Masculino", "Femenino"];

// Pantalla de registro, conectada al endpoint de autoservicio de pacientes. El DUI es opcional
// (puede haber pacientes menores de edad sin DUI todavía) — el resto de campos son requeridos.
// Al registrarse con éxito, no navegamos a Login: register() ya deja al paciente autenticado
// (mismo token/usuario que un login), así que RootNavigator (App.js) salta directo al stack
// autenticado en cuanto isLoggedIn pasa a true.
const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dui, setDui] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("Masculino");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const clearError = (key) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleDuiChange = (text) => {
    setDui(maskDui(text));
    clearError("dui");
  };

  const handlePhoneChange = (text) => {
    setPhone(maskPhone(text));
    clearError("phone");
  };

  const validateForm = () => {
    const next = {};

    if (!name.trim()) next.name = "El campo Nombres es requerido";
    if (!lastName.trim()) next.lastName = "El campo Apellidos es requerido";
    if (!birthDate.trim()) next.birthDate = "El campo Nacimiento es requerido";

    if (!phone.trim()) {
      next.phone = "El campo Teléfono es requerido";
    } else if (!PHONE_REGEX.test(phone)) {
      next.phone = "Formato de teléfono inválido, debe ser XXXX-XXXX";
    }

    // El DUI es opcional: solo se valida el formato si se llegó a escribir algo
    if (dui.trim() && !DUI_REGEX.test(dui)) {
      next.dui = "Formato de DUI inválido, debe ser XXXXXXXX-X";
    }

    if (!email.trim()) {
      next.email = "El campo Correo es requerido";
    } else if (!EMAIL_REGEX.test(email)) {
      next.email = "Formato de correo inválido";
    }

    if (!password.trim()) {
      next.password = "El campo Contraseña es requerido";
    } else {
      const passwordError = getPasswordError(password);
      if (passwordError) next.password = passwordError;
    }

    return next;
  };

  const handleRegister = async () => {
    if (loading) return;

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showError("Revisa los campos marcados en rojo.");
      return;
    }

    setLoading(true);

    const result = await register({
      name: name.trim(),
      last_name: lastName.trim(),
      dui: dui.trim() || undefined,
      birth_date: toISODate(birthDate),
      gender,
      phone: phone.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    if (result.ok) {
      console.log("[Register] Éxito. Usuario autenticado:", result.user);
      await showSuccess("¡Cuenta creada! Bienvenido.");
    } else {
      console.log("[Register] Falló:", result.message);
      showError(result.message);
      setLoading(false);
    }
    // En caso de éxito no apagamos "loading": la pantalla se desmonta sola cuando
    // RootNavigator cambia de stack al ver isLoggedIn = true.
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroRegister}>
          <View style={styles.blobRegisterBig} />
          <View style={styles.blobRegisterSoft} />
        </View>

        <View style={styles.body}>
          <View style={styles.logoBlock}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.title}>Regístrate</Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Nombres"
              placeholder="Ingresa tus nombres"
              value={name}
              onChangeText={(text) => { setName(text); clearError("name"); }}
              error={errors.name}
            />

            <FormInput
              label="Apellidos"
              placeholder="Ingresa tus apellidos"
              value={lastName}
              onChangeText={(text) => { setLastName(text); clearError("lastName"); }}
              error={errors.lastName}
            />

            <View style={styles.row}>
              <View style={styles.rowField}>
                <FormInput
                  label="DUI (opcional)"
                  placeholder="01234567-8"
                  value={dui}
                  onChangeText={handleDuiChange}
                  keyboardType="numeric"
                  maxLength={10}
                  error={errors.dui}
                />
              </View>
              <View style={styles.rowField}>
                <FormDateInput
                  label="Nacimiento"
                  value={birthDate}
                  onChange={(text) => { setBirthDate(text); clearError("birthDate"); }}
                  error={errors.birthDate}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowField}>
                <FormSelect
                  label="Género"
                  value={gender}
                  options={GENDER_OPTIONS}
                  onChange={setGender}
                />
              </View>
              <View style={styles.rowField}>
                <FormInput
                  label="Teléfono"
                  placeholder="7890-7890"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={9}
                  error={errors.phone}
                />
              </View>
            </View>

            <FormInput
              label="Correo"
              placeholder="ejemplo@mail.com"
              value={email}
              onChangeText={(text) => { setEmail(text); clearError("email"); }}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
            />

            <View style={formStyles.field}>
              <Text style={formStyles.label}>Contraseña</Text>
              <View style={[formStyles.input, formStyles.inputRow, errors.password && { borderColor: colors.danger }]}>
                <TextInput
                  style={formStyles.inputValue}
                  placeholder="Crea una contraseña"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(text) => { setPassword(text); clearError("password"); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword((prev) => !prev)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={formStyles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Regístrate</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.footerLinkWrap}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
