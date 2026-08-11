import React from "react";
import { View, Text } from "react-native";
import styles from "../../styles/medications/medicationStyle";

const StepIndicator = ({ steps = [], current = 1 }) => (
  <View style={styles.stepper}>
    {steps.map((label, index) => {
      const number = index + 1;
      const active = number <= current;

      return (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
                {number}
              </Text>
            </View>
            <Text
              style={[styles.stepLabel, active && styles.stepLabelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>

          {index < steps.length - 1 ? (
            <View style={[styles.stepLine, number < current && styles.stepLineActive]} />
          ) : null}
        </React.Fragment>
      );
    })}
  </View>
);

export default StepIndicator;