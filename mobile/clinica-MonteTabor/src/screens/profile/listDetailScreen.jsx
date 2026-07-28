import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DetailHeader from "../../components/profile/DetailHeader";
import SummaryCard from "../../components/profile/SummaryCard";
import RecordItem from "../../components/profile/RecordItem";
import EmptyState from "../../components/profile/EmptyState";
import BottomAction from "../../components/profile/BottomAction";
import styles from "../../styles/profile/detailStyle";

const ListDetailScreen = ({ navigation, route }) => {
  const config = detailConfig[route.params?.key] || {};
  const items = config.items || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <DetailHeader title={config.title} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {config.summary ? <SummaryCard {...config.summary} /> : null}

        {items.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon || config.summary?.icon}
            title={config.emptyTitle}
            text={config.emptyText}
          />
        ) : (
          items.map((item) => (
            <RecordItem
              key={item.title}
              record={item}
              onMenu={config.showMenu ? () => console.log("menu", item.title) : undefined}
            />
          ))
        )}
      </ScrollView>

      <BottomAction
        label={config.addLabel}
        onPress={() => console.log("Agregar en", config.title)}
      />
    </SafeAreaView>
  );
};

export default ListDetailScreen;