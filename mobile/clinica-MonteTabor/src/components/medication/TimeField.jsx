import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const toDate = (label) => {
  const d = new Date();
  if (!label) return d;
  const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return d;
  let [, h, m, period] = match;
  h = Number(h) % 12 + (period.toUpperCase() === "PM" ? 12 : 0);
  d.setHours(h, Number(m), 0, 0);
  return d;
};

const toLabel = (date) => {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${period}`;
};

const TimeField = ({ label, value, onChange, onRemove }) => {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(toDate(value));

  const open = () => {
    setTemp(toDate(value));
    setShow(true);
  };

  const onAndroidChange = (event, selected) => {
    setShow(false);
    if (event.type === "set" && selected) onChange(toLabel(selected));
  };

  const picker = (
    <DateTimePicker
      value={temp}
      mode="time"
      is24Hour={false}
      display={Platform.OS === "ios" ? "spinner" : "default"}
      onChange={
        Platform.OS === "ios"
          ? (e, selected) => selected && setTemp(selected)
          : onAndroidChange
      }
    />
  );

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity style={styles.timeRow} activeOpacity={0.7} onPress={open}>
        <Text style={styles.timeText}>{value || "--:-- --"}</Text>

        <View style={styles.timeActions}>
          {onRemove ? (
            <TouchableOpacity activeOpacity={0.6} onPress={onRemove}>
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="time-outline" size={17} color={colors.muted} />
        </View>
      </TouchableOpacity>

      {show && Platform.OS === "android" && picker}

      {Platform.OS === "ios" && (
        <Modal visible={show} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShow(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{label || "Selecciona la hora"}</Text>
              {picker}
              <TouchableOpacity
                style={[styles.primaryButton, { marginHorizontal: 20, marginTop: 8 }]}
                activeOpacity={0.85}
                onPress={() => {
                  onChange(toLabel(temp));
                  setShow(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Listo</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

export default TimeField;