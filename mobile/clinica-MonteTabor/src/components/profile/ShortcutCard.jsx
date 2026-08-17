import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { colors } from "../../styles/profile/profileStyle";

const ShortcutCard = ({ icon, title, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.shortcut}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.shortcutText} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default ShortcutCard;