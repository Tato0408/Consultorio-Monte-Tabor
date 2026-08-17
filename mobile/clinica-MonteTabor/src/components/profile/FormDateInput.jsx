import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";
import { parseDate, formatDate } from "../../utils/date";

const FormDateInput = ({ label, value, onChange, error }) => {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(parseDate(value));

  const open = () => {
    setTemp(parseDate(value));
    setShow(true);
  };

  // Android: el picker se cierra solo y devuelve el evento
  const onAndroidChange = (event, selected) => {
    setShow(false);
    if (event.type === "set" && selected) onChange(formatDate(selected));
  };

  const confirmIOS = () => {
    onChange(formatDate(temp));
    setShow(false);
  };

  const picker = (
    <DateTimePicker
      value={temp}
      mode="date"
      display={Platform.OS === "ios" ? "spinner" : "default"}
      maximumDate={new Date()}
      minimumDate={new Date(1900, 0, 1)}
      locale="es-ES"
      onChange={
        Platform.OS === "ios"
          ? (e, selected) => selected && setTemp(selected)
          : onAndroidChange
      }
    />
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.input,
          styles.inputRow,
          error && { borderColor: colors.danger },
        ]}
        activeOpacity={0.7}
        onPress={open}
      >
        <Text style={[styles.inputValue, !value && styles.inputPlaceholder]}>
          {value || "DD/MM/AAAA"}
        </Text>
        <Ionicons name="calendar-outline" size={17} color={colors.muted} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Android renderiza un diálogo nativo directo */}
      {show && Platform.OS === "android" && picker}

      {/* iOS: lo envolvemos en un modal con botones */}
      {Platform.OS === "ios" && (
        <Modal visible={show} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShow(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.pickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.pickerDone}>Listo</Text>
                </TouchableOpacity>
              </View>

              {picker}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

export default FormDateInput;