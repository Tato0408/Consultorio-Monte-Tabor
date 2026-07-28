import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import DetailHeader from "../../components/profile/DetailHeader";
import KeyValuePanel from "../../components/profile/KeyValuePanel";
import styles from "../../styles/profile/detailStyle";
import { bloodTypeData } from "../../data/healthData";

const Chips = ({ label, values }) => (
  <>
    <Text style={styles.chipLabel}>{label}</Text>
    <View style={styles.chipsRow}>
      {values.map((v) => (
        <View key={v} style={styles.chip}>
          <Text style={styles.chipText}>{v}</Text>
        </View>
      ))}
    </View>
  </>
);

const BloodTypeScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Tipo de sangre" onBack={() => navigation.goBack()} />

    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bloodHero}>
        <View style={styles.bloodCircle}>
          <Ionicons name="water" size={30} color="#E5484D" />
        </View>
        <Text style={styles.bloodCaption}>Tu tipo de sangre</Text>
        <Text style={styles.bloodValue}>{bloodTypeData.type}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>¿Qué significa?</Text>
        <Text style={styles.emptyText}>{bloodTypeData.meaning}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Compatibilidad</Text>
        <Chips label="Puedes donar a" values={bloodTypeData.canDonateTo} />
        <Chips label="Puedes recibir de" values={bloodTypeData.canReceiveFrom} />
      </View>

      <KeyValuePanel
        rows={[{ label: "Fecha de registro", value: bloodTypeData.registeredAt }]}
      />
    </ScrollView>
  </SafeAreaView>
);

export default BloodTypeScreen;