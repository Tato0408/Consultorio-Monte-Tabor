import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../../styles/medications/medicationStyle";

const RadioGroup = ({ options = [], value, onChange }) => (
  <View>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={styles.radioRow}
          activeOpacity={0.6}
          onPress={() => onChange(option.value)}
        >
          <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
            {active ? <View style={styles.radioInner} /> : null}
          </View>
          <Text style={styles.radioLabel}>{option.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default RadioGroup;