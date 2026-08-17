import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/healthStyle";

const SecurityNotice = ({ onPress }) => {
  return (
    <View style={styles.notice}>
      <View style={styles.noticeCircle}>
        <Ionicons name="lock-closed-outline" size={28} color="#2F6BFF" />
      </View>

      <Text style={styles.noticeTitle}>Tu información está segura</Text>
      <Text style={styles.noticeText}>
        Protegemos tus datos personales y de salud con los más altos
        estándares de seguridad
      </Text>

      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Text style={styles.noticeLink}>Ver política de seguridad</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SecurityNotice;