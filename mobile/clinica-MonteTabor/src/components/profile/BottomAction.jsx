import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";

const BottomAction = ({ label, icon = "add", variant = "primary", onPress }) => (
  <View style={styles.footer}>
    <TouchableOpacity
      style={variant === "outline" ? styles.outlineButton : styles.primaryButton}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {variant === "primary" && icon ? (
        <Ionicons name={icon} size={16} color="#fff" />
      ) : null}
      <Text
        style={
          variant === "outline" ? styles.outlineButtonText : styles.primaryButtonText
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  </View>
);

export default BottomAction;