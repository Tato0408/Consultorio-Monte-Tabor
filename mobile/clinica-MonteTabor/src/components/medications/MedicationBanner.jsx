import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/medications/medicationStyle";

const MedicationBanner = () => (
  <View style={styles.banner}>
    <View style={styles.bannerTexts}>
      <Text style={styles.bannerTitle}>Mantén tu tratamiento al día</Text>
      <Text style={styles.bannerText}>
        Agrega tus medicamentos para recibir recordatorios de cada toma.
      </Text>
    </View>
    <View style={styles.bannerIcon}>
      <Ionicons name="medkit-outline" size={26} color="#fff" />
    </View>
  </View>
);

export default MedicationBanner;
