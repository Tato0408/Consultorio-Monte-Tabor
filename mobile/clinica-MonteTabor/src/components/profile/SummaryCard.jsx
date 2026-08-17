import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

const SummaryCard = ({ icon = "clipboard-outline", label, value }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryIcon}>
      <Ionicons name={icon} size={17} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  </View>
);

export default SummaryCard;