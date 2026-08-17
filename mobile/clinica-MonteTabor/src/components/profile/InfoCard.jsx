import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { colors } from "../../styles/profile/profileStyle";

const InfoCard = ({ title, items = [], layout = "stacked", footer }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      {items.map((item, index) => {
        const isLast = index === items.length - 1 && !footer;
        const tint = item.danger ? colors.danger : colors.primary;
        const Row = item.onPress ? TouchableOpacity : View;

        return (
          <Row
            key={item.label}
            style={[styles.row, isLast && styles.rowLast]}
            activeOpacity={0.6}
            onPress={item.onPress}
          >
            {item.icon ? (
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={18} color={tint} />
              </View>
            ) : null}

            <View style={styles.rowTexts}>
              <Text
                style={[styles.rowLabel, item.danger && { color: colors.danger }]}
              >
                {item.label}
              </Text>
              {layout === "stacked" && item.value ? (
                <Text style={styles.rowValue}>{item.value}</Text>
              ) : null}
            </View>

            {layout === "inline" && item.value ? (
              <Text style={styles.rowValueRight}>{item.value}</Text>
            ) : null}

            {item.chevron ? (
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            ) : null}
          </Row>
        );
      })}

      {footer ? (
        <TouchableOpacity
          style={styles.footerLink}
          activeOpacity={0.7}
          onPress={footer.onPress}
        >
          <Text style={styles.footerLinkText}>{footer.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default InfoCard;