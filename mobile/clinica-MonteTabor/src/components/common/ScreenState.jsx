import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/profile/detailStyle";
import { colors } from "../../styles/profile/profileStyle";

export const LoadingState = ({ text = "Cargando..." }) => (
  <View style={styles.empty}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={[styles.emptyText, { marginTop: 14 }]}>{text}</Text>
  </View>
);

export const ErrorState = ({ message, onRetry }) => (
  <View style={styles.empty}>
    <View style={[styles.emptyCircle, { backgroundColor: "#FDECEC" }]}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
    </View>
    <Text style={styles.emptyTitle}>No se pudo cargar la información</Text>
    <Text style={styles.emptyText}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity
        style={[styles.outlineButton, { marginTop: 18, paddingHorizontal: 28 }]}
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text style={styles.outlineButtonText}>Reintentar</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);