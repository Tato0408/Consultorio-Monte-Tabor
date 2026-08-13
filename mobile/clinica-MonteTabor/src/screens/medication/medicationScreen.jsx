import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import MedicationBanner from "../../components/medications/MedicationBanner";
import MedicationCard from "../../components/medications/MedicationCard";
import EmptyMedications from "../../components/medications/EmptyMedications";
import BottomTabBar from "../../components/medications/BottomTabBar";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import styles from "../../styles/medications/medicationStyle";
import { colors } from "../../styles/profile/profileStyle";

const MedicationsScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadMedications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const response = await apiClient("/medications/patient", { params: { limit: 50 } });
      setMedications(response.data || []);
    } catch (err) {
      setError(true);
      showError(err.message || "No se pudieron cargar tus medicamentos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMedications(); }, [loadMedications]));

  const { activos, completados } = useMemo(() => ({
    activos: medications.filter((med) => med.status === "active"),
    completados: medications.filter((med) => med.status === "completed"),
  }), [medications]);

  const goToForm = () => navigation.navigate("AddMedication");

  const confirmDelete = (med) => {
    Alert.alert(
      "Eliminar medicamento",
      `Se eliminará "${med.name}" y sus recordatorios.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const backup = medications;
            setMedications((prev) => prev.filter((item) => item._id !== med._id));
            try {
              await apiClient(`/medications/${med._id}`, { method: "DELETE" });
            } catch (err) {
              setMedications(backup);
              showError(err.message || "No se pudo eliminar el medicamento.");
            }
          },
        },
      ]
    );
  };

  const renderActivos = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />;
    }
    if (error) {
      return (
        <EmptyMedications
          icon="cloud-offline-outline"
          title="No pudimos cargar tus medicamentos"
          text="Revisa tu conexión y desliza hacia abajo para volver a intentarlo."
        />
      );
    }
    if (!activos.length) {
      return (
        <EmptyMedications
          title="No tienes medicamentos activos"
          text="Agrega un medicamento para recibir recordatorios de tus tomas."
        />
      );
    }
    return activos.map((med) => (
      <MedicationCard
        key={med._id}
        med={med}
        onPress={() => navigation.navigate("MedicationDetail", { id: med._id })}
        onMenu={() => confirmDelete(med)}
      />
    ));
  };

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMedications({ silent: true }); }}
          />
        }
      >
        <MedicationBanner />

        <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={goToForm}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Agregar medicamento</Text>
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Medicamentos activos</Text>
        </View>

        {renderActivos()}

        <View style={[styles.sectionRow, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>Medicamentos completados</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {loading || error ? null : completados.length === 0 ? (
          <EmptyMedications
            icon="checkmark-done-outline"
            title="Aún no has completado tratamientos"
            text="Los medicamentos que termines aparecerán aquí."
          />
        ) : (
          completados.map((med) => (
            <MedicationCard key={med._id} med={med} onMenu={() => confirmDelete(med)} />
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