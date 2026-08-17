import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

/** record: { title, lines: [], icon } */
const RecordItem = ({ record, icon, onMenu }) => (
  <View style={styles.item}>
    <View style={styles.itemRow}>
      {icon || record.icon ? (
        <View style={styles.itemIcon}>
          <Ionicons name={record.icon || icon} size={16} color={colors.primary} />
        </View>
      ) : null}

      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{record.title}</Text>
        {(record.lines || []).map((line) => (
          <Text key={line} style={styles.itemLine}>{line}</Text>
        ))}
      </View>

      {onMenu ? (
        <TouchableOpacity style={styles.itemMenu} activeOpacity={0.6} onPress={onMenu}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

export default RecordItem;