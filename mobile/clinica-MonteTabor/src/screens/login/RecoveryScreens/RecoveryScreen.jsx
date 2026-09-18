import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import HexLogo from "../../../components/HexLogo";
import FormInput from "../../../components/profile/FormInput";
import styles from "../../../styles/loginStyle";
import { showSuccess, showError } from "../../../lib/toast";
import { EMAIL_REGEX } from "../../../utils/validation";
import { useRecoveryPatient } from "../../../hooks/recovery/useRecoveryPatient";

// Primer paso de recuperación de contraseña: pide el correo y solicita el código al backend
// (basado en Recovery.jsx de la web, sin el "probar cada rol" porque móvil solo tiene pacientes).
const RecoveryScreen = ({ navigation }) => {
  const { loading, requestCode } = useRecoveryPatient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    if (!email.trim()) return "El campo Correo es requerido";
    if (!EMAIL_REGEX.test(email)) return "Formato de correo inválido";
    return "";
  };

  const handleSubmit = async () => {
    if (loading) return;

    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const data = await requestCode(email.trim());
      showSuccess("Se ha enviado un código de verificación a tu correo.");
      navigation.navigate("VerifyCode", { email: email.trim(), recoveryToken: data.recoveryToken });
    } catch (err) {
      showError(err.message || "No se pudo enviar el código.");
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
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Login")}>
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
                <FormInput
                  label="Correo"
                  placeholder="Ingresa tu correo"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setError(""); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={error}
                />

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

              <View style={styles.footerDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.footerLinkWrap}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.footerLink}>Regístrate</Text>
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

export default RecoveryScreen;
