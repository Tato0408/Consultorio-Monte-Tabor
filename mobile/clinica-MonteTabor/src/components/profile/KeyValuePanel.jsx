import React from "react";
import { View, Text } from "react-native";
import styles from "../../styles/profile/detailStyle";

const KeyValuePanel = ({ title, rows = [] }) => (
  <View style={styles.panel}>
    {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
    {rows.map((row, i) => (
      <View
        key={row.label}
        style={[styles.kvRow, i === rows.length - 1 && styles.kvRowLast]}
      >
        <Text style={styles.kvLabel}>{row.label}</Text>
        <Text style={styles.kvValue}>{row.value}</Text>
      </View>
    ))}
  </View>
);

export default KeyValuePanel;