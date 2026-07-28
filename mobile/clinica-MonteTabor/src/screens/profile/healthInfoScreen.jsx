import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import HealthRow from "../../components/profile/HealthRow";
import SecurityNotice from "../../components/profile/SecurityNotice";
import { healthSummaryLayout, EMPTY_VALUE } from "../../config/healthSections";
import styles from "../../styles/profile/healthStyle";

const HealthInfoScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <DetailHeader title="Información de salud" onBack={() => navigation.goBack()} />

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {healthSummaryLayout.map((block) => (
        <View key={block.section}>
          <Text style={styles.sectionTitle}>{block.section}</Text>
          <View style={styles.card}>
            {block.rows.map((row, i) => (
              <HealthRow
                key={row.key}
                icon={row.icon}
                color={row.color}
                label={row.label}
                value={EMPTY_VALUE}
                isLast={i === block.rows.length - 1}
                onPress={() => navigation.navigate(row.screen, row.params)}
              />
            ))}
          </View>
        </View>
      ))}

      <SecurityNotice onPress={() => console.log("Política")} />
    </ScrollView>
  </SafeAreaView>
);

export default HealthInfoScreen;