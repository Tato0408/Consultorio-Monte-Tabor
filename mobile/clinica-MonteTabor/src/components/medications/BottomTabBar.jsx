import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const tabs = [
  { key: "home", icon: "home-outline", label: "Inicio" },
  { key: "appointments", icon: "calendar-outline", label: "Consultas" },
  { key: "fab" },
  { key: "medications", icon: "medkit-outline", label: "Medicamentos" },
  { key: "profile", icon: "person-outline", label: "Perfil" },
];

const BottomTabBar = ({ active = "medications", onPress, onFabPress }) => (
  <View style={styles.tabBar}>
    {tabs.map((tab) =>
      tab.key === "fab" ? (
        <View key="fab" style={styles.tabItem}>
          <TouchableOpacity style={styles.tabFab} activeOpacity={0.85} onPress={onFabPress}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => onPress?.(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={19}
            color={active === tab.key ? colors.primary : colors.muted}
          />
          <Text
            style={[styles.tabLabel, active === tab.key && styles.tabLabelActive]}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      )
    )}
  </View>
);

export default BottomTabBar;