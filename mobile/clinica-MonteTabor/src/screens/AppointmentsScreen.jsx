import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../components/BottomNav";
import styles from "../styles/appointmentsStyle";

const AppointmentsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Consultas</Text>
        <Text style={styles.subtitle}>Aquí irá el contenido de la pantalla de consultas.</Text>
      </View>

      <BottomNav navigation={navigation} active="Appointments" />
    </SafeAreaView>
  );
};

export default AppointmentsScreen;
