import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";
import { parseDate, formatDate } from "../../utils/date";
import DatePickerSheet from "../common/DatePickerSheet";

// Campo de fecha con formato DD/MM/AAAA. Abre DatePickerSheet, que permite
// saltar por año, mes o semana. Por defecto no deja elegir fechas posteriores
// a hoy (fecha de nacimiento, filtros de documentos); maximumDate y
// minimumDate se pueden cambiar si algún formulario lo necesita.
const FormDateInput = ({ label, value, onChange, error, maximumDate, minimumDate }) => {
  const [show, setShow] = useState(false);

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
        onPress={() => setShow(true)}
      >
        <Text style={[styles.inputValue, !value && styles.inputPlaceholder]}>
          {value || "DD/MM/AAAA"}
        </Text>
        <Ionicons name="calendar-outline" size={17} color={colors.muted} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <DatePickerSheet
        visible={show}
        title={label}
        value={value ? parseDate(value) : null}
        maximumDate={maximumDate || new Date()}
        minimumDate={minimumDate || new Date(1900, 0, 1)}
        onCancel={() => setShow(false)}
        onConfirm={(date) => {
          onChange(formatDate(date));
          setShow(false);
        }}
      />
    </View>
  );
};

export default FormDateInput;
