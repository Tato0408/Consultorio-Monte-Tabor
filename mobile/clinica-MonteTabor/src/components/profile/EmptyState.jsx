import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

const EmptyState = ({ icon = "document-text-outline", title, text }) => (
  <View style={styles.empty}>
    <View style={styles.emptyCircle}>
      <Ionicons name={icon} size={28} color={colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {text ? <Text style={styles.emptyText}>{text}</Text> : null}
  </View>
);

export default EmptyState;