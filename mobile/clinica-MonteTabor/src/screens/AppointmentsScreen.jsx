import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import BottomNav from "../components/BottomNav";
import ConsultationCard from "../components/appointments/ConsultationCard";
import { LoadingState, ErrorState } from "../components/common/ScreenState";
import EmptyState from "../components/profile/EmptyState";
import { useMyConsultations } from "../hooks/appointments/useMyConsultations";
import styles from "../styles/appointmentsStyle";
import { colors } from "../styles/profile/profileStyle";

const STATUS_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "completed", label: "Completadas" },
  { key: "pending", label: "Pendientes" },
];

const CURRENT_YEAR = new Date().getFullYear();

const AppointmentsScreen = ({ navigation }) => {
  const { consultations, loading, error, refetch } = useMyConsultations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyThisYear, setOnlyThisYear] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return consultations.filter((item) => {
      if (statusFilter === "completed" && item.status !== "completed") return false;
      if (statusFilter === "pending" && !["pending", "scheduled"].includes(item.status)) return false;

      if (onlyThisYear) {
        // getUTCFullYear (no getFullYear): "date" es medianoche UTC del día de la cita, sin hora
        // propia — leerla en horario local puede correr el año en dispositivos detrás de UTC.
        const year = item.date ? new Date(item.date).getUTCFullYear() : null;
        if (year !== CURRENT_YEAR) return false;
      }

      if (!query) return true;
      const haystack = [
        item.doctor?.name,
        item.doctor?.last_name,
        item.doctor?.specialty,
        item.diagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [consultations, search, statusFilter, onlyThisYear]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        data={loading || error ? [] : filtered}
        keyExtractor={(item) => String(item.appointment_id)}
        renderItem={({ item }) => <ConsultationCard item={item} />}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Mis consultas</Text>
            <Text style={styles.subtitle}>
              Aquí puedes ver el historial completo de tus citas médicas.
            </Text>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar consulta, doctor o diagnóstico"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>

            <View style={styles.chipsRow}>
              {STATUS_FILTERS.map((filter) => {
                const active = statusFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.8}
                    onPress={() => setStatusFilter(filter.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.chip, onlyThisYear && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => setOnlyThisYear((v) => !v)}
              >
                <Text style={[styles.chipText, onlyThisYear && styles.chipTextActive]}>
                  Este año
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={onlyThisYear ? "#fff" : colors.muted}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {!loading && !error ? (
              <Text style={styles.sectionTitle}>Historial de consultas</Text>
            ) : null}

            {loading ? <LoadingState text="Cargando tus consultas..." /> : null}
            {error ? <ErrorState message={error} onRetry={refetch} /> : null}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              icon="calendar-outline"
              title={
                consultations.length === 0
                  ? "Todavía no tienes consultas registradas"
                  : "No se encontraron consultas"
              }
              text={
                consultations.length === 0
                  ? "Cuando agendes o asistas a una cita, aparecerá aquí."
                  : "Prueba con otra búsqueda o cambia los filtros."
              }
            />
          ) : null
        }
      />

      <BottomNav navigation={navigation} active="Appointments" />
    </SafeAreaView>
  );
};

export default AppointmentsScreen;
