import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import HexLogo from "../../../components/HexLogo";
import styles from "../../../styles/loginStyle";
import formStyles from "../../../styles/profile/editProfileStyle";
import { colors } from "../../../styles/profile/profileStyle";
import { showSuccess, showError } from "../../../lib/toast";
import { useRecoveryPatient } from "../../../hooks/recovery/useRecoveryPatient";

// El código lo genera el backend con crypto.randomBytes(3).toString("hex") — 6 caracteres
// hexadecimales (0-9, a-f), no solo dígitos. Misma regla que codeRules en VerifyCode.jsx (web).
const HEX_REGEX = /^[a-fA-F0-9]*$/;

// Segundo paso: código de verificación. Basado en VerifyCode.jsx de la web — mismo criterio de
// validación (6 caracteres hex) y mismo comportamiento de "reenviar" (vuelve a pedir un código).
const VerifyCodeScreen = ({ navigation, route }) => {
  const { email, recoveryToken: initialToken } = route.params ?? {};
  const { loading, verifyCode, requestCode } = useRecoveryPatient();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [recoveryToken, setRecoveryToken] = useState(initialToken);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  const codeString = code.join("");
  const isValidCode = codeString.length === 6 && HEX_REGEX.test(codeString);

  const setDigit = (index) => (text) => {
    // Solo caracteres hexadecimales, en minúscula (el código del backend siempre es minúscula)
    const clean = text.replace(/[^a-fA-F0-9]/g, "").toLowerCase().slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    setError("");
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index) => ({ nativeEvent }) => {
    if (nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (loading) return;

    if (!isValidCode) {
      setError("Ingresa el código completo (6 caracteres)");
      return;
    }

    try {
      const data = await verifyCode(codeString, recoveryToken);
      showSuccess("Código verificado correctamente.");
      navigation.navigate("NewPassword", { email, recoveryToken: data.recoveryToken });
    } catch (err) {
      setError(err.message || "Código incorrecto o expirado.");
    }
  };

  const handleResend = async () => {
    if (loading || !email) return;
    setError("");

    try {
      const data = await requestCode(email);
      setRecoveryToken(data.recoveryToken);
      setCode(["", "", "", "", "", ""]);
      showSuccess("Código reenviado correctamente.");
    } catch (err) {
      showError(err.message || "No se pudo reenviar el código.");
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
                <Text style={styles.recoverySubtitle}>Ingresa el código de verificación</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.codeRow}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      style={[styles.codeBox, error && { borderColor: colors.danger }]}
                      value={digit}
                      onChangeText={setDigit(index)}
                      onKeyPress={handleKeyPress(index)}
                      autoCapitalize="none"
                      maxLength={1}
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                    />
                  ))}
                </View>
                {error ? <Text style={[formStyles.errorText, { textAlign: "center", marginTop: -12, marginBottom: 16 }]}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirmar</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footerLinkWrap}>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleResend} disabled={loading} style={{ marginTop: 18 }}>
                    <Text style={styles.footerLink}>¿No recibiste el código? Reenviar</Text>
                  </TouchableOpacity>
                </View>
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

export default VerifyCodeScreen;
