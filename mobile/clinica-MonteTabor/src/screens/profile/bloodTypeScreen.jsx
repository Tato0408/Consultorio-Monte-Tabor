import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import EmptyState from "../../components/profile/EmptyState";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";

const BloodTypeScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Tipo de sangre" onBack={() => navigation.goBack()} />

    <EmptyState
      icon="water-outline"
      title="No tienes un tipo de sangre registrado"
      text="Consulta con tu médico y registra este dato en tu perfil."
    />

    <BottomAction
      label="Registrar tipo de sangre"
      onPress={() => console.log("Registrar tipo de sangre")}
    />
  </SafeAreaView>
);

export default BloodTypeScreen;