import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../components/BottomNav";
import styles from "../styles/medicationsStyle";

const MedicationsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Medicamentos</Text>
        <Text style={styles.subtitle}>Aquí irá el contenido de la pantalla de medicamentos.</Text>
      </View>

      <BottomNav navigation={navigation} active="Medications" />
    </SafeAreaView>
  );
};

export default MedicationsScreen;
