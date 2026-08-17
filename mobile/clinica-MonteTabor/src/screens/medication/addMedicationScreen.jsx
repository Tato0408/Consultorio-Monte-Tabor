import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const AddMedicationScreen = ({ navigation }) => {
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

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#EEF2FF",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="medkit-outline" size={32} color={colors.primary} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B", textAlign: "center" }}>
          Los medicamentos los agrega tu doctor
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#94A3B8",
            textAlign: "center",
            marginTop: 8,
            lineHeight: 19,
          }}
        >
          Cuando tu médico te recete un medicamento durante la consulta, aparecerá
          automáticamente en tu lista de "Medicamentos de hoy". Pronto podrás llevar
          tu propio registro aquí.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 24, alignSelf: "stretch" }]}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddMedicationScreen;