import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import EmptyState from "../../components/profile/EmptyState";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";

const LifestyleScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Estilo de vida" onBack={() => navigation.goBack()} />

    <EmptyState
      icon="walk-outline"
      title="No has registrado tu estilo de vida"
      text="Estos datos ayudan a tu médico a darte mejores recomendaciones."
    />

    <BottomAction
      label="Registrar información"
      icon="create-outline"
      onPress={() => console.log("Registrar estilo de vida")}
    />
  </SafeAreaView>
);

export default LifestyleScreen;