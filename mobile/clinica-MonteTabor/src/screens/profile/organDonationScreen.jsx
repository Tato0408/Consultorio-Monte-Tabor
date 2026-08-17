import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import DetailHeader from "../../components/profile/DetailHeader";
import EmptyState from "../../components/profile/EmptyState";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

const OrganDonationScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Donación de órganos" onBack={() => navigation.goBack()} />

    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <EmptyState
        icon="sparkles-outline"
        title="No has registrado tu decisión"
        text="Puedes indicar si deseas ser donante de órganos. Es una decisión personal y reversible."
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
      label="Registrar decisión"
      onPress={() => console.log("Registrar decisión")}
    />
  </SafeAreaView>
);

export default OrganDonationScreen;