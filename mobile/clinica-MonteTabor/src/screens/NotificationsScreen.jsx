import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../lib/apiClient";
import { showError } from "../lib/toast";
import styles from "../styles/notificationsStyle";

const relativeDate = (value) => {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiClient("/notifications/me");
      setNotifications(response.data || []);
      setUnreadCount(Number(response.unreadCount) || 0);
    } catch (error) {
      showError(error.message || "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = useMemo(() => notifications.reduce((result, item) => {
    const label = new Date(item.createdAt).toDateString() === new Date().toDateString() ? "Hoy" : "Anteriores";
    if (!result[label]) result[label] = [];
    result[label].push(item);
    return result;
  }, {}), [notifications]);

  const openNotification = async (item) => {
    if (!item.read) {
      try {
        await apiClient(`/notifications/${item._id}/read`, { method: "PATCH" });
        setNotifications((current) => current.map((entry) => entry._id === item._id ? { ...entry, read: true } : entry));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (error) {
        showError(error.message || "No se pudo marcar como leída.");
        return;
      }
    }
    if (item.appointment_id) {
      const appointmentId = String(item.appointment_id);
      try {
        const response = await apiClient(`/appointments/patient/${appointmentId}`);
        if (response.data?.status === "completed") {
          navigation.navigate("Appointments", {
            initialView: "consultations",
            navigationKey: Date.now(),
          });
          return;
        }
        if (["pending", "scheduled"].includes(response.data?.status)) {
          navigation.navigate("AppointmentDetail", { appointmentId });
          return;
        }
        navigation.navigate("Appointments");
      } catch (error) {
        showError(error.message || "No se pudo abrir la cita.");
      }
    }
  };

  const markAll = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await apiClient("/notifications/read-all", { method: "PATCH" });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      showError(error.message || "No se pudieron marcar las notificaciones.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} sin leer` : "Todo al día"}</Text>
        </View>
        <TouchableOpacity disabled={!unreadCount || markingAll} onPress={markAll} style={styles.readAllButton}>
          {markingAll ? <ActivityIndicator size="small" color="#2F6BFF" /> : <Text style={[styles.readAllText, !unreadCount && styles.readAllDisabled]}>Leer todas</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load({ silent: true }); }} />}>
        {loading ? <ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} /> : notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="notifications-off-outline" size={36} color="#718096" /></View>
            <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
            <Text style={styles.emptyText}>Aquí aparecerán las novedades sobre tus citas.</Text>
          </View>
        ) : Object.entries(groups).map(([label, items]) => (
          <View key={label}>
            <Text style={styles.sectionTitle}>{label}</Text>
            {items.map((item) => (
              <TouchableOpacity key={item._id} activeOpacity={0.75} onPress={() => openNotification(item)} style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={[styles.icon, !item.read && styles.iconUnread]}><Ionicons name="calendar-outline" size={20} color={item.read ? "#718096" : "#2F6BFF"} /></View>
                <View style={styles.cardText}>
                  <View style={styles.cardMeta}><Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>Actualización de tu cita</Text>{!item.read ? <View style={styles.unreadDot} /> : null}</View>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.time}>{relativeDate(item.createdAt)}</Text>
                </View>
                {item.appointment_id ? <Ionicons name="chevron-forward" size={18} color="#A0AEC0" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
