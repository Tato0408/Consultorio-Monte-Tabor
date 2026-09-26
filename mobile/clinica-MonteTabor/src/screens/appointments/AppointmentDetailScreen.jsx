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
import { showError, showSuccess, confirmAction } from "../../lib/toast";
import { formatTime12h } from "../../utils/date";
import { asProcedureArray } from "../../utils/procedures";
import styles from "../../styles/appointments/appointmentDetailStyle";

const STATUS = {
  // Mismo texto que AppointmentsScreen.jsx (el listado) para el mismo estado.
  pending: { label: "Pendiente", color: "#A16207", bg: "#FFF7D6" },
  scheduled: { label: "Programada", color: "#245CE0", bg: "#E8EFFF" },
  needs_reschedule: { label: "Por reagendar", color: "#C2410C", bg: "#FFEDD5" },
  expired: { label: "Por reagendar", color: "#C2410C", bg: "#FFEDD5" },
};

// Estados desde los que el paciente puede reagendar reusando el mismo registro.
const RESCHEDULABLE = ["pending", "needs_reschedule", "expired"];

// A menos de 30 minutos del inicio (o ya empezada), una cita ya aceptada no se puede
// cancelar sola: el paciente debe coordinarlo con quien lo atenderá. Mismo criterio que
// isCancelLockedForPatient en el backend (appointmentStatus.js) y que cancelarBloqueado en
// el portal público (MyAppointments.jsx) — acá solo se anticipa del lado del cliente para
// no hacer escribir un motivo obligatorio para nada; el backend sigue siendo quien de
// verdad lo aplica.
const CANCEL_LOCK_MS = 30 * 60 * 1000;
const inicioDeCita = (appt) => {
  const d = new Date(appt.date);
  const [h, m] = String(appt.start_time || "0:0").split(":").map(Number);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0, 0);
};
const cancelarBloqueado = (appt) =>
  appt.status === "scheduled" && inicioDeCita(appt).getTime() - Date.now() <= CANCEL_LOCK_MS;
const RESCHEDULE_REASON_TEXT = {
  no_aceptada: "Ningún profesional aceptó tu cita a tiempo. Elige una nueva fecha y hora.",
  cupo_asignado: "El horario que solicitaste se le asignó a otro paciente. Elige una nueva fecha y hora.",
};

const longDate = (value) => new Date(value).toLocaleDateString("es-SV", {
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
  const [reagendandoConfirmada, setReagendandoConfirmada] = useState(false);
  const [eliminando, setEliminando] = useState(false);

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

  const abrirCancelar = () => {
    if (cancelarBloqueado(appointment)) {
      const conQuien = appointment.doctor_id ? "el doctor que te atenderá" : "la clínica";
      showError(`Tu cita está próxima a comenzar. Para cancelarla, comunícate con ${conQuien} y lleguen a un acuerdo.`);
      return;
    }
    setCancelVisible(true);
  };

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

  // Reagendar una cita ya confirmada (scheduled) no puede reusar el mismo registro: el
  // backend solo lo permite para pending/needs_reschedule/expired (ver
  // RESCHEDULABLE_STATUSES en appointmentStatus.js). Mismo criterio que el portal público
  // (handleReagendar en MyAppointments.jsx): se cancela para liberar el cupo y se agenda
  // una nueva, prellenada con el mismo servicio y proveedor.
  const reagendarConfirmada = async () => {
    const confirmado = await confirmAction({
      title: "Reagendar cita",
      text: "Se cancelará esta cita para que puedas elegir una nueva fecha y hora. ¿Deseas continuar?",
      confirmText: "Sí, reagendar",
      cancelText: "No, conservar cita",
    });
    if (!confirmado) return;

    setReagendandoConfirmada(true);
    try {
      await apiClient(`/appointments/patient/${appointment._id}/cancel`, {
        method: "PATCH",
        body: { cancellation_reason: "Cancelada por el paciente para reagendar" },
      });
      navigation.replace("NewAppointment", {
        prefill: {
          procedureIds: asProcedureArray(appointment.procedure_id).map((p) => p._id),
          doctorId: appointment.doctor_id?._id || null,
          nurseId: appointment.nurse_id?._id || null,
          motivo: appointment.description || "",
        },
      });
    } catch (error) {
      showError(error.message || "No se pudo reagendar la cita.");
    } finally {
      setReagendandoConfirmada(false);
    }
  };

  // Cancelar una solicitud que nunca fue aceptada (pending/needs_reschedule/expired, los
  // mismos 3 estados desde los que ya se puede reagendar) no la deja "cancelada": la elimina
  // por completo, porque ningún doctor llegó a aceptarla y no hay nada clínico que dependa de
  // ella. Reemplaza al botón de cancelar-con-motivo de más abajo, que solo tiene sentido para
  // una cita ya confirmada (scheduled).
  const eliminarSolicitud = async () => {
    const confirmado = await confirmAction({
      title: "Cancelar cita",
      text: "Como ningún profesional la aceptó, esta solicitud se eliminará por completo en vez de solo marcarse como cancelada. Esta acción no se puede deshacer. ¿Deseas continuar?",
      confirmText: "Sí, cancelar",
      cancelText: "No, conservar",
      destructive: true,
    });
    if (!confirmado) return;

    setEliminando(true);
    try {
      await apiClient(`/appointments/patient/${appointment._id}`, { method: "DELETE" });
      showSuccess("La solicitud fue eliminada.");
      navigation.goBack();
    } catch (error) {
      showError(error.message || "No se pudo eliminar la cita.");
    } finally {
      setEliminando(false);
    }
  };

  if (loading || !appointment) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} /></SafeAreaView>;
  }

  if (!["pending", "scheduled", "needs_reschedule", "expired"].includes(appointment.status)) {
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
  const service = asProcedureArray(appointment.procedure_id).map((p) => p.name).join(", ") || appointment.type;
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
          <Ionicons
            name={
              ["needs_reschedule", "expired"].includes(appointment.status)
                ? "alert-circle-outline"
                : appointment.status === "pending"
                  ? "hourglass-outline"
                  : "checkmark-circle-outline"
            }
            size={21}
            color={status.color}
          />
          <Text style={[styles.noticeText, { color: status.color }]}>
            {["needs_reschedule", "expired"].includes(appointment.status)
              ? RESCHEDULE_REASON_TEXT[appointment.reschedule_reason] || "Esta cita quedó sin confirmar. Elige una nueva fecha y hora."
              : appointment.status === "pending"
                ? "La solicitud aún debe ser aceptada por un doctor."
                : "Tu cita fue aceptada y está programada."}
          </Text>
        </View>

        {RESCHEDULABLE.includes(appointment.status) ? (
          <>
            <TouchableOpacity
              style={styles.cancelButton}
              disabled={eliminando}
              onPress={eliminarSolicitud}
            >
              {eliminando
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <>
                    <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                    <Text style={styles.cancelButtonText}>Cancelar cita</Text>
                  </>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={() => navigation.navigate("NewAppointment", {
                reschedule: {
                  appointmentId: appointment._id,
                  procedureIds: asProcedureArray(appointment.procedure_id).map((p) => p._id),
                },
              })}
            >
              <Ionicons name="calendar-outline" size={20} color="#FFF" />
              <Text style={styles.rescheduleButtonText}>Reagendar cita</Text>
            </TouchableOpacity>
          </>
        ) : appointment.status === "scheduled" ? (
          <TouchableOpacity
            style={styles.rescheduleButton}
            disabled={reagendandoConfirmada}
            onPress={reagendarConfirmada}
          >
            {reagendandoConfirmada
              ? <ActivityIndicator size="small" color="#FFF" />
              : <>
                  <Ionicons name="calendar-outline" size={20} color="#FFF" />
                  <Text style={styles.rescheduleButtonText}>Reagendar cita</Text>
                </>}
          </TouchableOpacity>
        ) : null}

        {/* Solo para una cita ya confirmada (scheduled): pending/needs_reschedule/expired
            usan el bot\u00f3n de arriba, que elimina la solicitud en vez de solo cancelarla.
            abrirCancelar corta antes de abrir el di\u00e1logo si est\u00e1 a menos de 30 minutos de
            empezar. */}
        {appointment.status === "scheduled" ? (
          <TouchableOpacity style={styles.cancelButton} onPress={abrirCancelar}>
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancelar cita</Text>
          </TouchableOpacity>
        ) : null}
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
