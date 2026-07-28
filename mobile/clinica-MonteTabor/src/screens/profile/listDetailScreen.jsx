import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import SummaryCard from "../../components/profile/SummaryCard";
import EmptyState from "../../components/profile/EmptyState";
import BottomAction from "../../components/profile/BottomAction";
import { sectionsConfig } from "../../config/healthSections";
import styles from "../../styles/profile/detailStyle";

const ListDetailScreen = ({ navigation, route }) => {
  const key = route.params?.key;
  const config = sectionsConfig[key] || {};

  // Sin datos todavía
  const records = [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <DetailHeader title={config.title} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SummaryCard
          icon={config.icon}
          label={config.countLabel}
          value={String(records.length)}
        />

        <EmptyState
          icon={config.icon}
          title={config.emptyTitle}
          text={config.emptyText}
        />
      </ScrollView>

      <BottomAction
        label={config.addLabel}
        onPress={() => console.log("Agregar en", config.title)}
      />
    </SafeAreaView>
  );
};

export default ListDetailScreen;