import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { pillTint } from "../../styles/medications/medicationStyle";

export const ICON_OPTIONS = [
  { icon: "medkit-outline", color: "blue" },
  { icon: "flask-outline", color: "green" },
  { icon: "bandage-outline", color: "purple" },
  { icon: "eyedrop-outline", color: "amber" },
  { icon: "fitness-outline", color: "pink" },
  { icon: "nutrition-outline", color: "green" },
  { icon: "thermometer-outline", color: "blue" },
  { icon: "water-outline", color: "pink" },
];

const IconPickerModal = ({ visible, value, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Elige un ícono</Text>

        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map((option) => {
            const tint = pillTint[option.color];
            const active = option.icon === value;
            return (
              <TouchableOpacity
                key={option.icon}
                style={[
                  styles.iconOption,
                  { backgroundColor: tint.bg },
                  active && styles.iconOptionActive,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Ionicons name={option.icon} size={22} color={tint.fg} />
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export default IconPickerModal;