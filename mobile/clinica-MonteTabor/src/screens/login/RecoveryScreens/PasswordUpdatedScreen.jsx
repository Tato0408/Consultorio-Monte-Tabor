import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import HexLogo from "../../../components/HexLogo";
import styles from "../../../styles/loginStyle";

// Pantalla final del flujo de recuperación (equivalente a PasswordUpdated.jsx de la web).
// Solo interfaz: el botón lleva directo a Login, sin lógica de por medio.
const PasswordUpdatedScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroRecovery}>
            <View style={styles.blobRecoveryLeft} />
            <View style={styles.blobRecoveryRight} />
          </View>

          <View style={styles.body}>
            <View style={styles.logoBlock}>
              <HexLogo size={46} />
            </View>

            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={36} color="#1E9E63" />
              </View>
            </View>

            <Text style={styles.recoveryTitle}>¡Listo!</Text>
            <Text style={styles.recoverySubtitle}>Ya puedes iniciar sesión en tu cuenta</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Login")}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Ir al inicio de sesión</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <View pointerEvents="none" style={styles.blobBottomWrap}>
        <View style={styles.blobBottom} />
      </View>
    </View>
  );
};

export default PasswordUpdatedScreen;
