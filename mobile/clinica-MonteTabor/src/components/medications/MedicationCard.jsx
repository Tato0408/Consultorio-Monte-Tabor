import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { pillTint } from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

/**
 * med: {
 *   id, name, form, frequencyLabel, times: [], durationLabel,
 *   icon, color, completedAt
 * }
 */
const MedicationCard = ({ med = {}, onPress, onMenu }) => {
  const tint = pillTint[med.color] || pillTint.blue;
  const completed = !!med.completedAt;

  return (
    <TouchableOpacity
      style={styles.medCard}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <View style={styles.medTop}>
        <View style={[styles.medIcon, { backgroundColor: tint.bg }]}>
          <Ionicons name={med.icon || "medkit-outline"} size={18} color={tint.fg} />
        </View>

        <View style={styles.medBody}>
          <View style={styles.medTitleRow}>
            <Text style={styles.medName}>{med.name}</Text>
            {med.frequencyLabel ? (
              <View style={[styles.badge, { backgroundColor: tint.bg }]}>
                <Text style={[styles.badgeText, { color: tint.fg }]}>
                  {med.frequencyLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {med.form ? <Text style={styles.medForm}>{med.form}</Text> : null}
        </View>

        {onMenu ? (
          <TouchableOpacity style={styles.medMenu} activeOpacity={0.6} onPress={onMenu}>
            <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.medMeta}>
        {med.times?.length ? (
          <View style={styles.metaRow}>
            <Ionicons name="alarm-outline" size={13} color="#16A34A" />
            <Text style={styles.metaText}>{med.times.join("  ·  ")}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons
            name={completed ? "checkmark-circle-outline" : "calendar-outline"}
            size={13}
            color={colors.muted}
          />
          <Text style={styles.metaText}>
            {completed
              ? `Completado el ${med.completedAt}`
              : med.durationLabel || "Sin duración definida"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MedicationCard;