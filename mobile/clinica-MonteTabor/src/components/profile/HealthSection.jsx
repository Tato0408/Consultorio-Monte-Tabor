import React from "react";
import { View, Text } from "react-native";
import HealthRow from "./HealthRow";
import styles from "../../styles/profile/healthStyle";

const HealthSection = ({ title, items = [], onItemPress }) => {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.card}>
        {items.map((item, index) => (
          <HealthRow
            key={item.label}
            icon={item.icon}
            color={item.color}
            label={item.label}
            value={item.value}
            isLast={index === items.length - 1}
            onPress={onItemPress ? () => onItemPress(item) : undefined}
          />
        ))}
      </View>
    </View>
  );
};

export default HealthSection;