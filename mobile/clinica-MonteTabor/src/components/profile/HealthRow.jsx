import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { tint } from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

const HealthRow = ({
  icon,
  color = "blue",
  label,
  value,
  isLast,
  onPress,
}) => {
  const palette = tint[color] || tint.blue;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.row, isLast && styles.rowLast]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
        <Ionicons name={icon} size={17} color={palette.fg} />
      </View>

      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Wrapper>
  );
};

export default HealthRow;