import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

const FormSelect = ({
  label,
  value,
  options = [],
  placeholder = "Seleccionar",
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const select = (option) => {
    onChange?.(option);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.input, styles.inputRow]}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.inputValue, !value && styles.inputPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>

            <ScrollView bounces={false}>
              {options.map((option) => {
                const active = option === value;
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOption}
                    activeOpacity={0.6}
                    onPress={() => select(option)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default FormSelect;