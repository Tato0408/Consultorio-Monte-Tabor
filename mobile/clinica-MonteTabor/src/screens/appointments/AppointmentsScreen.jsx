import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import BottomNav from "../../components/BottomNav";
import NotificationBell from "../../components/NotificationBell";
import ConsultationCard from "../../components/appointments/ConsultationCard";
import { ErrorState } from "../../components/common/ScreenState";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import { useMyConsultations } from "../../hooks/appointments/useMyConsultations";
import { formatTime12h } from "../../utils/date";
import { asProcedureArray } from "../../utils/procedures";
import styles from "../../styles/appointments/appointmentsStyle";
import { colors } from "../../styles/profile/profileStyle";

const STATUS = {
  pending: { label: "Pendiente", tone: "amber" }, scheduled: { label: "Programada", tone: "blue" },
  // Anticipo en línea creado pero sin confirmar (ver activateAfterDeposit en el backend):
  // antes el backend (GET /appointments/patient) la excluía para cualquier rol, staff o
  // paciente por igual, así que el paciente no tenía forma de verla ni de retomar un pago
  // que quedó a medias — solo le quedaba esperar a que se autoeliminara sola a los 30 min.
  pending_payment: { label: "Pago pendiente", tone: "amber" },
  completed: { label: "Completada", tone: "green" }, cancelled: { label: "Cancelada", tone: "red" },
  // Mismo texto que appointmentsStyle.js (este mismo módulo) y que el panel
  // privado/portal público para el mismo estado: antes decía "No asistió" solo acá.
  no_show: { label: "No se presentó", tone: "gray" },
  needs_reschedule: { label: "Por reagendar", tone: "orange" }, expired: { label: "Por reagendar", tone: "orange" },
};

// Estados que se listan en la pestaña de citas (las demás, canceladas/no_show, viven en el
// historial de consultas). "completed" no entra aquí: tiene su propio filtro "Atendidas"
// más abajo, que sí se le suma a esta lista solo cuando ese filtro está activo.
const OPEN_STATUSES = ["pending", "pending_payment", "scheduled", "needs_reschedule", "expired"];
const REAGENDABLES = ["needs_reschedule", "expired"];

const APPOINTMENT_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "completed", label: "Atendidas" },
  { key: "pending", label: "Pendientes" },
  { key: "scheduled", label: "Programadas" },
  { key: "needs_reschedule", label: "Por reagendar" },
];

const dateLabel = (value) => new Date(value).toLocaleDateString("es-SV", {
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
          <Text style={styles.requestTitle}>{asProcedureArray(appointment.procedure_id).map((p) => p.name).join(", ") || appointment.type}</Text>
          <Text style={styles.requestDoctor}>{doctor}</Text>
        </View>
        <View style={[styles.requestBadge, styles[`requestBadge_${status.tone}`]]}>
          <Text style={[styles.requestBadgeText, styles[`requestBadgeText_${status.tone}`]]}>{status.label}</Text>
        </View>
      </View>
      {REAGENDABLES.includes(appointment.status) ? (
        <View style={styles.requestReasonRow}>
          <Text style={[styles.requestReasonLabel, { color: "#C2410C" }]}>Acción requerida</Text>
          <Text style={styles.requestReason} numberOfLines={2}>
            {appointment.reschedule_reason === "cupo_asignado"
              ? "El horario se asignó a otro paciente. Reagenda tu cita."
              : "Ningún profesional la aceptó a tiempo. Reagenda tu cita."}
          </Text>
        </View>
      ) : appointment.description ? (
        <View style={styles.requestReasonRow}>
          <Text style={styles.requestReasonLabel}>Motivo</Text>
          <Text style={styles.requestReason} numberOfLines={2}>{appointment.description}</Text>
        </View>
      ) : null}
      <View style={styles.detailHint}>
        <Text style={styles.detailHintText}>{REAGENDABLES.includes(appointment.status) ? "Reagendar" : "Ver detalles"}</Text>
        <Ionicons name="chevron-forward" size={16} color="#2F6BFF" />
      </View>
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
      if (appointmentFilter === "completed") {
        if (item.status !== "completed") return false;
      } else {
        if (!OPEN_STATUSES.includes(item.status)) return false;
        if (appointmentFilter === "needs_reschedule" ? !REAGENDABLES.includes(item.status)
          : appointmentFilter !== "all" && item.status !== appointmentFilter) return false;
      }
      if (!term) return true;
      const doctor = item.doctor_id ? `${item.doctor_id.name} ${item.doctor_id.last_name}` : "";
      const procedureNames = asProcedureArray(item.procedure_id).map((p) => p.name).join(" ") || item.type;
      return `${procedureNames} ${doctor} ${item.description || ""}`.toLowerCase().includes(term);
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
      {/* Mismo patrón que medicationScreen.jsx: flecha de volver a la izquierda y
          campana de notificaciones a la derecha — antes esta pantalla no tenía
          ninguna de las dos, a diferencia de Agendar cita y Mis medicinas. */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis consultas</Text>
        <NotificationBell navigation={navigation} color={colors.text} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
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
            onPress={() => {
              // Una cita atendida abre el detalle de su consulta, igual que la pestaña
              // "Consultas completadas". Si la consulta aún no aparece en la lista,
              // AppointmentDetail la busca y redirige por su cuenta.
              const consultation = appointment.status === "completed"
                ? consultations.find((item) => String(item.appointment_id) === String(appointment._id))
                : null;
              if (consultation?.consultation_id) {
                navigation.navigate("ConsultationDetail", { consultationId: consultation.consultation_id });
                return;
              }
              navigation.navigate("AppointmentDetail", { appointmentId: appointment._id });
            }}
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
