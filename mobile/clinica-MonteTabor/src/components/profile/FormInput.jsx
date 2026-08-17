import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

const FormInput = ({ label, value, onChangeText, error, ...rest }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && { borderColor: colors.danger },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default FormInput;