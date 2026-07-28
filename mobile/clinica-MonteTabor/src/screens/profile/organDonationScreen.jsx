import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import DetailHeader from "../../components/profile/DetailHeader";
import KeyValuePanel from "../../components/profile/KeyValuePanel";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";
import { organDonationData } from "../../data/healthData";

const OrganDonationScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Donación de órganos" onBack={() => navigation.goBack()} />

    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <Ionicons name="checkmark" size={17} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Tu decisión</Text>
          <Text style={styles.statusValue}>{organDonationData.decision}</Text>
        </View>
      </View>

      <KeyValuePanel
        title="Información registrada"
        rows={[
          { label: "Fecha", value: organDonationData.date },
          { label: "Tipo de donación", value: organDonationData.scope },
        ]}
      />

      <View style={styles.noticeBox}>
        <View style={styles.noticeHeader}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.noticeTitle}>Importante</Text>
        </View>
        <Text style={styles.noticeLine}>
          Comparte esta decisión con tu familia. Puedes cambiarla en cualquier
          momento desde esta pantalla.
        </Text>
      </View>
    </ScrollView>

    <BottomAction
      label="Cambiar decisión"
      variant="outline"
      onPress={() => console.log("Cambiar decisión")}
    />
  </SafeAreaView>
);

export default OrganDonationScreen;