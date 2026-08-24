import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import BottomNav from "../../components/BottomNav";
import ConsultationCard from "../../components/appointments/ConsultationCard";
import { ErrorState } from "../../components/common/ScreenState";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import { useMyConsultations } from "../../hooks/appointments/useMyConsultations";
import { formatTime12h } from "../../utils/date";
import styles from "../../styles/appointments/appointmentsStyle";

const STATUS = {
  pending: { label: "Pendiente", tone: "amber" }, scheduled: { label: "Programada", tone: "blue" },
  completed: { label: "Completada", tone: "green" }, cancelled: { label: "Cancelada", tone: "red" },
  no_show: { label: "No asistió", tone: "gray" }, expired: { label: "Vencida", tone: "gray" },
};

const APPOINTMENT_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "scheduled", label: "Programadas" },
];

const dateLabel = (value) => new Date(value).toLocaleDateString("es-GT", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

const AppointmentCard = ({ appointment, onPress }) => {
  const status = STATUS[appointment.status] || { label: appointment.status, tone: "gray" };
  const doctor = appointment.doctor_id
    ? `Dr. ${appointment.doctor_id.name} ${appointment.doctor_id.last_name}`
    : "Esperando asignación de doctor";
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.requestCard}>
      <View style={styles.requestCardTop}>
        <View style={styles.requestDateIcon}><Ionicons name="calendar-outline" size={21} color="#2F6BFF" /></View>
        <View style={styles.requestHeading}>
          <Text style={styles.requestDate}>{dateLabel(appointment.date)} · {formatTime12h(appointment.start_time)}</Text>
          <Text style={styles.requestTitle}>{appointment.procedure_id?.name || appointment.type}</Text>
          <Text style={styles.requestDoctor}>{doctor}</Text>
        </View>
        <View style={[styles.requestBadge, styles[`requestBadge_${status.tone}`]]}>
          <Text style={[styles.requestBadgeText, styles[`requestBadgeText_${status.tone}`]]}>{status.label}</Text>
        </View>
      </View>
      {appointment.description ? (
        <View style={styles.requestReasonRow}>
          <Text style={styles.requestReasonLabel}>Motivo</Text>
          <Text style={styles.requestReason} numberOfLines={2}>{appointment.description}</Text>
        </View>
      ) : null}
      <View style={styles.detailHint}><Text style={styles.detailHintText}>Ver detalles</Text><Ionicons name="chevron-forward" size={16} color="#2F6BFF" /></View>
    </TouchableOpacity>
  );
};

export default function AppointmentsScreen({ navigation, route }) {
  const [view, setView] = useState(route.params?.initialView === "consultations" ? "consultations" : "appointments");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const { consultations, loading: consultationsLoading, error: consultationsError, refetch: refetchConsultations } = useMyConsultations();

  useEffect(() => {
    if (route.params?.initialView === "consultations") {
      setView("consultations");
      navigation.setParams({ initialView: undefined, navigationKey: undefined });
    }
  }, [navigation, route.params?.initialView, route.params?.navigationKey]);

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setAppointmentsLoading(true);
    try {
      const response = await apiClient("/appointments/patient", { params: { limit: 50 } });
      setAppointments(response.data || []);
    } catch (error) {
      showError(error.message || "No se pudieron cargar tus citas.");
    } finally {
      setAppointmentsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAppointments(); }, [loadAppointments]));

  const visibleAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (!["pending", "scheduled"].includes(item.status)) return false;
      if (appointmentFilter !== "all" && item.status !== appointmentFilter) return false;
      if (!term) return true;
      const doctor = item.doctor_id ? `${item.doctor_id.name} ${item.doctor_id.last_name}` : "";
      return `${item.procedure_id?.name || item.type} ${doctor} ${item.description || ""}`.toLowerCase().includes(term);
    });
  }, [appointments, appointmentFilter, search]);

  const completedConsultations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return consultations.filter((item) => {
      if (item.status !== "completed") return false;
      if (!term) return true;
      return [item.doctor?.name, item.doctor?.last_name, item.doctor?.specialty, item.diagnosis]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [consultations, search]);

  const refresh = async () => {
    setRefreshing(true);
    if (view === "appointments") await loadAppointments({ silent: true });
    else {
      await refetchConsultations();
      setRefreshing(false);
    }
  };

  const isAppointments = view === "appointments";
  const loading = isAppointments ? appointmentsLoading : consultationsLoading;
  const visibleCount = isAppointments ? visibleAppointments.length : completedConsultations.length;
  const openForm = () => navigation.navigate("NewAppointment");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.title}>Mis consultas</Text>
        <Text style={styles.subtitle}>Consulta tus próximas citas y el historial médico completado.</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#8A94A6" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={isAppointments ? "Buscar cita, doctor o motivo" : "Buscar doctor o diagnóstico"}
            placeholderTextColor="#8A94A6"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.primaryFilters}>
          <TouchableOpacity style={[styles.primaryChip, isAppointments && styles.primaryChipActive]} onPress={() => setView("appointments")}>
            <Ionicons name="calendar-outline" size={16} color={isAppointments ? "#FFF" : "#64748B"} />
            <Text style={[styles.primaryChipText, isAppointments && styles.primaryChipTextActive]}>Citas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryChip, !isAppointments && styles.primaryChipActive]} onPress={() => setView("consultations")}>
            <Ionicons name="document-text-outline" size={16} color={!isAppointments ? "#FFF" : "#64748B"} />
            <Text style={[styles.primaryChipText, !isAppointments && styles.primaryChipTextActive]}>Consultas completadas</Text>
          </TouchableOpacity>
        </ScrollView>

        {isAppointments ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryFilters}>
            {APPOINTMENT_FILTERS.map((filter) => {
              const active = appointmentFilter === filter.key;
              return (
                <TouchableOpacity key={filter.key} style={[styles.secondaryChip, active && styles.secondaryChipActive]} onPress={() => setAppointmentFilter(filter.key)}>
                  <Text style={[styles.secondaryChipText, active && styles.secondaryChipTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isAppointments ? "Próximas citas" : "Historial de consultas"}</Text>
          <Text style={styles.count}>{visibleCount}</Text>
        </View>

        {!isAppointments && consultationsError ? <ErrorState message={consultationsError} onRetry={refetchConsultations} /> : null}
        {loading ? <ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} /> : null}

        {!loading && isAppointments && visibleAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment._id}
            appointment={appointment}
            onPress={() => navigation.navigate("AppointmentDetail", { appointmentId: appointment._id })}
          />
        ))}

        {!loading && !isAppointments && !consultationsError && completedConsultations.map((consultation) => (
          <ConsultationCard
            key={String(consultation.appointment_id)}
            item={consultation}
            onPress={
              consultation.consultation_id
                ? () => navigation.navigate("ConsultationDetail", { consultationId: consultation.consultation_id })
                : undefined
            }
          />
        ))}

        {!loading && !consultationsError && visibleCount === 0 ? (
          <View style={styles.requestEmpty}>
            <Ionicons name={isAppointments ? "calendar-outline" : "document-text-outline"} size={38} color="#94A3B8" />
            <Text style={styles.requestEmptyTitle}>{isAppointments ? "No hay citas en este filtro" : "No hay consultas completadas"}</Text>
            <Text style={styles.requestEmptyText}>{isAppointments ? "Agenda una cita o cambia el filtro seleccionado." : "Cuando finalice una consulta médica aparecerá en este historial."}</Text>
            {isAppointments ? <TouchableOpacity style={styles.emptyButton} onPress={openForm}><Text style={styles.emptyButtonText}>Agendar cita</Text></TouchableOpacity> : null}
          </View>
        ) : null}
      </ScrollView>
      <BottomNav navigation={navigation} active="Appointments" onAddPress={openForm} />
    </SafeAreaView>
  );
}
