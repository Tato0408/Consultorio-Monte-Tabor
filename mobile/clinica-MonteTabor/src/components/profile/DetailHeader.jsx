import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

const DetailHeader = ({ title, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
      <Ionicons name="arrow-back" size={22} color={colors.text} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

export default DetailHeader;