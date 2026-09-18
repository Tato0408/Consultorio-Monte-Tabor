import React, { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../lib/apiClient";
import { onNotificationPushed } from "../lib/notificationEvents";

export default function NotificationBell({ navigation, color = "#111827" }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    apiClient("/notifications/me")
      .then((response) => active && setUnreadCount(Number(response.unreadCount) || 0))
      .catch(() => {});
    return () => { active = false; };
  }, []));

  // Notificación empujada por WebSocket (ver AuthContext.jsx): el badge sube al instante
  // sin esperar a que la pantalla vuelva a ganar foco.
  useEffect(() => {
    return onNotificationPushed((notification) => {
      if (!notification?.read) setUnreadCount((prev) => prev + 1);
    });
  }, []);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("Notifications")}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="notifications-outline" size={23} color={color} />
      {unreadCount > 0 ? (
        <View style={{ position: "absolute", right: 1, top: 1, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", borderWidth: 2, borderColor: "#F4F6FA", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
          <Text style={{ color: "#FFF", fontSize: 9, fontWeight: "800" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
