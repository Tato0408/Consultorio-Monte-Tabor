import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../lib/apiClient";
import { showError, showSuccess } from "../../lib/toast";
import { formatTime12h } from "../../utils/date";
import styles from "../../styles/appointments/appointmentDetailStyle";

const STATUS = {
  pending: { label: "Pendiente de asignación", color: "#A16207", bg: "#FFF7D6" },
  scheduled: { label: "Programada", color: "#245CE0", bg: "#E8EFFF" },
};

const longDate = (value) => new Date(value).toLocaleDateString("es-GT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIcon}><Ionicons name={icon} size={18} color="#2F6BFF" /></View>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function AppointmentDetailScreen({ navigation, route }) {
  const { appointmentId } = route.params || {};
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) {
      showError("No se recibió la cita.");
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient(`/appointments/patient/${appointmentId}`);
      setAppointment(response.data);
    } catch (error) {
      showError(error.message || "No se pudo cargar la cita.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [appointmentId, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cancelAppointment = async () => {
    const reason = cancellationReason.trim();
    if (reason.length < 3) {
      showError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }

    setCancelling(true);
    try {
      await apiClient(`/appointments/patient/${appointment._id}/cancel`, {
        method: "PATCH",
        body: { cancellation_reason: reason },
      });
      setCancelVisible(false);
      setCancellationReason("");
      showSuccess("La cita fue cancelada.");
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo cancelar la cita.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !appointment) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} /></SafeAreaView>;
  }

  if (!["pending", "scheduled"].includes(appointment.status)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de la cita</Text><View style={styles.backButton} />
        </View>
        <View style={styles.unavailable}>
          <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
          <Text style={styles.unavailableTitle}>Este detalle corresponde a otra sección</Text>
          <Text style={styles.unavailableText}>Los detalles de citas completadas se mostrarán en la pantalla de consulta clínica.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const doctor = appointment.doctor_id;
  const service = appointment.procedure_id?.name || appointment.type;
  const status = STATUS[appointment.status];
  const initials = doctor ? `${doctor.name?.[0] || ""}${doctor.last_name?.[0] || ""}` : "?";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de la cita</Text><View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {doctor?.img_url ? <Image source={{ uri: doctor.img_url }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>}
          <View style={styles.doctorText}>
            <Text style={styles.doctorName}>{doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}` : "Doctor por asignar"}</Text>
            <Text style={styles.specialty}>{doctor?.specialty || (appointment.status === "pending" ? "Tu solicitud está esperando aceptación" : "Médico asignado")}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
        </View>

        <View style={styles.infoCard}>
          <DetailItem icon="calendar-outline" label="Fecha" value={longDate(appointment.date)} />
          <DetailItem icon="time-outline" label="Horario" value={`${formatTime12h(appointment.start_time)} – ${formatTime12h(appointment.end_time)}`} />
          <DetailItem icon="hourglass-outline" label="Duración" value={`${appointment.duration_minutes || 30} minutos`} />
          <DetailItem icon="medkit-outline" label="Servicio" value={service} />
          <DetailItem icon="cash-outline" label="Costo estimado" value={`$${Number(appointment.total || 0).toFixed(2)}`} />
          {appointment.nurse_id ? <DetailItem icon="people-outline" label="Enfermera asignada" value={`${appointment.nurse_id.name} ${appointment.nurse_id.last_name || ""}`} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivo de la consulta</Text>
          <Text style={styles.sectionText}>{appointment.description || "No especificaste un motivo para esta cita."}</Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name={appointment.status === "pending" ? "hourglass-outline" : "checkmark-circle-outline"} size={21} color={status.color} />
          <Text style={[styles.noticeText, { color: status.color }]}>{appointment.status === "pending" ? "La solicitud aún debe ser aceptada por un doctor." : "Tu cita fue aceptada y está programada."}</Text>
        </View>

        {/* Se puede cancelar en cualquier momento mientras la cita siga pending/scheduled
            (ver el filtro justo arriba de este return), incluso si ya comenz\u00f3 o su fecha
            ya pas\u00f3 \u2014 misma regla que la web y que ya aplica el backend. */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => setCancelVisible(true)}>
          <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.cancelButtonText}>Cancelar cita</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={cancelVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !cancelling && setCancelVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={() => !cancelling && setCancelVisible(false)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="calendar-clear-outline" size={25} color="#DC2626" />
                  </View>
                  <Text style={styles.modalTitle}>Cancelar cita</Text>
                  <Text style={styles.modalText}>
                    Cuéntanos por qué necesitas cancelarla. El motivo es obligatorio.
                  </Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={cancellationReason}
                    onChangeText={setCancellationReason}
                    placeholder="Escribe el motivo de la cancelación"
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={500}
                    editable={!cancelling}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Text style={styles.characterCount}>{cancellationReason.length}/500</Text>
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.keepButton}
                      disabled={cancelling}
                      onPress={() => setCancelVisible(false)}
                    >
                      <Text style={styles.keepButtonText}>Conservar cita</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmCancelButton, (cancelling || cancellationReason.trim().length < 3) && styles.disabledButton]}
                      disabled={cancelling || cancellationReason.trim().length < 3}
                      onPress={cancelAppointment}
                    >
                      {cancelling
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={styles.confirmCancelText}>Sí, cancelar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
