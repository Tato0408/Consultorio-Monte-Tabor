import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import FormInput from "../../components/profile/FormInput";
import styles from "../../styles/loginStyle";
import formStyles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../lib/toast";

// Pantalla de inicio de sesión, ahora conectada al backend real (login de pacientes).
// No navegamos manualmente al éxito: RootNavigator (App.js) cambia de stack solo en cuanto
// isLoggedIn pasa a true, así que aquí solo nos preocupamos de llamar a login() y avisar.
const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    const result = await login(email, password);

    if (result.ok) {
      console.log("[Login] Éxito. Usuario autenticado:", result.user);
      await showSuccess("¡Bienvenido de nuevo!");
    } else {
      console.log("[Login] Falló:", result.message);
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
        <View style={styles.heroLogin}>
          <View style={styles.blobLoginBig} />
          <View style={styles.blobLoginSoft} />
        </View>

        <View style={styles.body}>
          <View style={styles.logoBlock}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.title}>Iniciar sesión</Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Correo"
              placeholder="Ingresa tu correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={formStyles.field}>
              <Text style={formStyles.label}>Contraseña</Text>
              <View style={[formStyles.input, formStyles.inputRow]}>
                <TextInput
                  style={formStyles.inputValue}
                  placeholder="Ingresa tu contraseña"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.forgotWrap}>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
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
  );
};

export default LoginScreen;
