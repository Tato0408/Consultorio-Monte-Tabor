import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import HexLogo from "../../../components/HexLogo";
import styles from "../../../styles/loginStyle";
import formStyles from "../../../styles/profile/editProfileStyle";
import { colors } from "../../../styles/profile/profileStyle";
import { showSuccess, showError } from "../../../lib/toast";
import { getPasswordError } from "../../../utils/validation";
import { useRecoveryPatient, RECOVERY_ERROR_MESSAGES } from "../../../hooks/recovery/useRecoveryPatient";

// Tercer paso: nueva contraseña + confirmación. Mismas reglas de contraseña que RegisterScreen
// (utils/validation.js) y basado en NewPassword.jsx de la web.
const NewPasswordScreen = ({ navigation, route }) => {
  const { recoveryToken } = route.params ?? {};
  const { loading, newPassword } = useRecoveryPatient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (key) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validateForm = () => {
    const next = {};

    if (!password.trim()) {
      next.password = "El campo Contraseña es requerido";
    } else {
      const passwordError = getPasswordError(password);
      if (passwordError) next.password = passwordError;
    }

    if (!confirmPassword.trim()) {
      next.confirmPassword = "El campo Confirmación es requerido";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Las contraseñas no coinciden";
    }

    return next;
  };

  const handleSubmit = async () => {
    if (loading) return;

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showError("Revisa los campos marcados en rojo.");
      return;
    }

    try {
      const data = await newPassword(password.trim(), confirmPassword.trim(), recoveryToken);
      console.log("[NewPassword] Contraseña actualizada:", data);
      showSuccess("Contraseña actualizada correctamente.");
      navigation.navigate("PasswordUpdated");
    } catch (err) {
      console.log("[NewPassword] Falló newPassword:", err.message);
      showError(RECOVERY_ERROR_MESSAGES[err.message] || "No se pudo cambiar la contraseña.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
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
            <View style={styles.heroRecovery}>
              <View style={styles.blobRecoveryLeft} />
              <View style={styles.blobRecoveryRight} />
            </View>

            <View style={styles.body}>
              <View style={styles.backRow}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center" }}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("Login")}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.primary} />
                  <Text style={styles.backText}>Volver al inicio</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.logoBlock}>
                <View style={{ marginBottom: 12 }}>
                  <HexLogo size={46} />
                </View>
                <Text style={styles.recoveryTitle}>Recupera tu contraseña</Text>
              </View>

              <View style={styles.form}>
                <View style={formStyles.field}>
                  <Text style={formStyles.label}>Ingresa tu nueva contraseña</Text>
                  <View style={[formStyles.input, formStyles.inputRow, errors.password && { borderColor: colors.danger }]}>
                    <TextInput
                      style={formStyles.inputValue}
                      placeholder="Ingresa tu contraseña"
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

                <View style={formStyles.field}>
                  <Text style={formStyles.label}>Confirma tu nueva contraseña</Text>
                  <View style={[formStyles.input, formStyles.inputRow, errors.confirmPassword && { borderColor: colors.danger }]}>
                    <TextInput
                      style={formStyles.inputValue}
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor={colors.muted}
                      value={confirmPassword}
                      onChangeText={(text) => { setConfirmPassword(text); clearError("confirmPassword"); }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setShowConfirmPassword((prev) => !prev)}>
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword ? <Text style={formStyles.errorText}>{errors.confirmPassword}</Text> : null}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <View pointerEvents="none" style={styles.blobBottomWrap}>
        <View style={styles.blobBottom} />
      </View>
    </View>
  );
};

export default NewPasswordScreen;
