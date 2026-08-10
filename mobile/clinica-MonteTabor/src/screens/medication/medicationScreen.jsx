import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import MedicationBanner from "../../components/medications/MedicationBanner";
import MedicationCard from "../../components/medications/MedicationCard";
import EmptyMedications from "../../components/medications/EmptyMedications";
import BottomTabBar from "../../components/medications/BottomTabBar";
import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const MedicationsScreen = ({ navigation }) => {
  // Sin datos todavía
  const activos = [];
  const completados = [];

  const goToForm = () => navigation.navigate("AddMedication");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Recordatorios de <Text style={styles.headerHighlight}> medicina </Text>
        </Text>

        <TouchableOpacity style={styles.headerSide} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MedicationBanner />

        <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={goToForm}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Agregar medicamento</Text>
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Medicamentos activos</Text>
        </View>

        {activos.length === 0 ? (
          <EmptyMedications
            title="No tienes medicamentos activos"
            text="Agrega un medicamento para recibir recordatorios de tus tomas."
          />
        ) : (
          activos.map((med) => (
            <MedicationCard
              key={med.id}
              med={med}
              onPress={() => navigation.navigate("MedicationDetail", { id: med.id })}
              onMenu={() => console.log("menu", med.id)}
            />
          ))
        )}

        <View style={[styles.sectionRow, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>Medicamentos completados</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {completados.length === 0 ? (
          <EmptyMedications
            icon="checkmark-done-outline"
            title="Aún no has completado tratamientos"
            text="Los medicamentos que termines aparecerán aquí."
          />
        ) : (
          completados.map((med) => (
            <MedicationCard key={med.id} med={med} onMenu={() => console.log("menu", med.id)} />
          ))
        )}
      </ScrollView>

      <BottomTabBar
        active="medications"
        onFabPress={goToForm}
        onPress={(key) => console.log("Tab:", key)}
      />
    </SafeAreaView>
  );
};

export default MedicationsScreen;