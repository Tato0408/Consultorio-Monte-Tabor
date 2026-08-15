import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../lib/toast";
import { getPasswordError } from "../../utils/validation";

// Pantalla de cambio de contraseña, accedida desde "Cambiar contraseña" en Perfil > Cuenta y
// seguridad. Basada en ChangePasswordModal.jsx de la web, con la diferencia de que aquí SÍ se
// pide y verifica la contraseña actual (el paciente ya está logueado, pero debe confirmarla).
// Mismo header/estilo que editProfileScreen.jsx y mismo campo con ícono de ojo que
// NewPasswordScreen.jsx (recuperación). La sesión se mantiene activa tras el cambio.
const ChangePasswordScreen = ({ navigation }) => {
  const { changePassword } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const clearError = (key) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validateForm = () => {
    const next = {};

    if (!oldPassword.trim()) next.oldPassword = "El campo Contraseña actual es requerido";

    if (!newPassword.trim()) {
      next.newPassword = "El campo Nueva contraseña es requerido";
    } else {
      const passwordError = getPasswordError(newPassword);
      if (passwordError) next.newPassword = passwordError;
      else if (oldPassword.trim() && newPassword === oldPassword) {
        next.newPassword = "La nueva contraseña debe ser diferente a la actual";
      }
    }

    if (!confirmPassword.trim()) {
      next.confirmPassword = "El campo Confirmación es requerido";
    } else if (confirmPassword !== newPassword) {
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

    setLoading(true);

    const result = await changePassword(oldPassword.trim(), newPassword.trim(), confirmPassword.trim());

    if (result.ok) {
      console.log("[ChangePassword] Contraseña actualizada correctamente.");
      showSuccess(result.message || "Contraseña actualizada correctamente.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigation?.goBack();
    } else {
      console.log("[ChangePassword] Falló:", result.message);
      // Si el backend identifica a qué campo pertenece el error, lo marcamos en rojo también
      if (result.message === "La contraseña actual es incorrecta") {
        setErrors({ oldPassword: result.message });
      } else if (result.message === "Las contraseñas no coinciden") {
        setErrors({ confirmPassword: result.message });
      } else if (result.message === "La nueva contraseña debe ser diferente a la actual") {
        setErrors({ newPassword: result.message });
      }
      showError(result.message);
    }

    setLoading(false);
  };

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

        <Text style={styles.headerTitle}>Cambiar contraseña</Text>

        <View style={styles.headerSide} />
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
          <Text style={styles.sectionTitle}>Seguridad de la cuenta</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña actual</Text>
            <View style={[styles.input, styles.inputRow, errors.oldPassword && { borderColor: colors.danger }]}>
              <TextInput
                style={styles.inputValue}
                placeholder="Ingresa tu contraseña actual"
                placeholderTextColor={colors.muted}
                value={oldPassword}
                onChangeText={(text) => { setOldPassword(text); clearError("oldPassword"); }}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowOldPassword((prev) => !prev)}>
                <Ionicons
                  name={showOldPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            {errors.oldPassword ? <Text style={styles.errorText}>{errors.oldPassword}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={[styles.input, styles.inputRow, errors.newPassword && { borderColor: colors.danger }]}>
              <TextInput
                style={styles.inputValue}
                placeholder="Ingresa tu nueva contraseña"
                placeholderTextColor={colors.muted}
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); clearError("newPassword"); }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNewPassword((prev) => !prev)}>
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar nueva contraseña</Text>
            <View style={[styles.input, styles.inputRow, errors.confirmPassword && { borderColor: colors.danger }]}>
              <TextInput
                style={styles.inputValue}
                placeholder="Ingresa tu nueva contraseña de nuevo"
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
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;
