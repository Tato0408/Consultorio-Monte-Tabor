import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HealthSection from "../../components/profile/HealthSection";
import SecurityNotice from "../../components/profile/SecurityNotice";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

const generalData = [
  { icon: "water-outline", color: "red", label: "Tipo de sangre", value: "O+" },
  { icon: "alert-circle-outline", color: "pink", label: "Alergias", value: "Polen, Penicilina" },
  { icon: "heart-outline", color: "red", label: "Enfermedades crónicas", value: "Ninguna" },
  { icon: "medkit-outline", color: "blue", label: "Medicamentos actuales", value: "2 medicamentos" },
];

const medicalHistory = [
  { icon: "cut-outline", color: "blue", label: "Cirugías", value: "Apendicectomía (2018)" },
  { icon: "business-outline", color: "blue", label: "Hospitalizaciones", value: "Ninguna" },
  { icon: "people-outline", color: "blue", label: "Antecedentes familiares", value: "Diabetes (Padre), Hipertensión (Madre)" },
  { icon: "shield-checkmark-outline", color: "blue", label: "Vacunas", value: "COVID-19, Influenza 2023" },
  { icon: "walk-outline", color: "blue", label: "Estilo de vida", value: "No fumador, ejercicio 3 veces por semana" },
];

const additionalInfo = [
  { icon: "document-text-outline", color: "purple", label: "Notas médicas", value: "No hay notas registradas" },
  { icon: "add-circle-outline", color: "green", label: "Grupo religioso (opcional)", value: "Católico" },
  { icon: "sparkles-outline", color: "amber", label: "Donación de órganos", value: "Sí, estoy de acuerdo" },
];

const HealthInfoScreen = ({ navigation }) => {
  const handlePress = (item) => console.log("Pressed:", item.label);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información de salud</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HealthSection
          title="Datos generales"
          items={generalData}
          onItemPress={handlePress}
        />

        <HealthSection
          title="Historial médico"
          items={medicalHistory}
          onItemPress={handlePress}
        />

        <HealthSection
          title="Información adicional"
          items={additionalInfo}
          onItemPress={handlePress}
        />

        <SecurityNotice onPress={() => handlePress({ label: "política" })} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthInfoScreen;