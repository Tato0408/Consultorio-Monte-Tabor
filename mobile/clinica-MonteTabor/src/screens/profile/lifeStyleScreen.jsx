import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import KeyValuePanel from "../../components/profile/KeyValuePanel";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";

const LifestyleScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Estilo de vida" onBack={() => navigation.goBack()} />

    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <KeyValuePanel rows={lifestyleData} />
    </ScrollView>

    <BottomAction
      label="Actualizar información"
      icon="create-outline"
      onPress={() => console.log("Editar estilo de vida")}
    />
  </SafeAreaView>
);

export default LifestyleScreen;