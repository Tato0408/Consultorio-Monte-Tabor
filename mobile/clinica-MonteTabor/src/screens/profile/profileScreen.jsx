import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import BottomNav from "../../components/BottomNav";
import ProfileCard from "../../components/profile/ProfileCard";
import ShortcutCard from "../../components/profile/ShortcutCard";
import InfoCard from "../../components/profile/InfoCard";
import apiClient from "../../lib/apiClient";
import styles, { colors } from "../../styles/profile/profileStyle";
import { useAuth } from "../../context/AuthContext";
import { showError, showSuccess, showWarning, confirmLogout } from "../../lib/toast";

const EMPTY = "Sin registrar";

const shortcuts = [
  { icon: "person-outline", title: "Mis datos", screen: "EditProfile" },
  { icon: "calendar-outline", title: "Mis consultas", screen: "Appointments" },
  { icon: "medkit-outline", title: "Medicamentos", screen: "Medications" },
  { icon: "notifications-outline", title: "Recordatorios" },
];

// El backend guarda fechas ISO; se formatea en UTC para que no se corra un día
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-GT", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      })
    : EMPTY;

const ProfileScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      // patientSelfController.getMe devuelve el paciente directo, sin envolverlo en { data }
      const response = await apiClient("/patientAccount/me");
      setPatient(response || null);
    } catch (error) {
      showError(error.message || "No se pudo cargar tu perfil.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  // Usa el único /logout del backend (mismo endpoint que la web, vale para cualquier rol).
  // No navegamos manualmente: al quedar isLoggedIn = false, RootNavigator (App.js) cambia
  // solo de vuelta al stack de Login.
  const handleLogout = useCallback(async () => {
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    const result = await logout();

    if (result.backendOk) {
      showSuccess("Sesión cerrada.");
    } else {
      showWarning("Sesión cerrada en este dispositivo. No se pudo notificar al servidor.");
    }
  }, [logout]);

  const personalInfo = useMemo(() => [
    { icon: "calendar-outline", label: "Fecha de nacimiento", value: dateLabel(patient?.birth_date), chevron: true },
    { icon: "card-outline", label: "DUI", value: patient?.dui || EMPTY, chevron: true },
    { icon: "male-female-outline", label: "Género", value: patient?.gender || EMPTY, chevron: true },
    { icon: "call-outline", label: "Teléfono", value: patient?.phone || EMPTY, chevron: true },
    { icon: "mail-outline", label: "Correo electrónico", value: patient?.email || EMPTY, chevron: true },
  ], [patient]);

  // Solo campos que existen en clinical_history: no hay alergias ni medicamentos actuales
  const healthInfo = useMemo(() => {
    const history = patient?.clinical_history;

    const chronic = history?.pathological?.length
      ? history.pathological.map((item) => item.disease).join(", ")
      : EMPTY;

    const hereditary = history?.hereditary?.length
      ? history.hereditary.map((item) => `${item.condition} (${item.relationship})`).join(", ")
      : EMPTY;

    return [
      { label: "Tipo de sangre", value: history?.blood_type || EMPTY },
      { label: "Enfermedades crónicas", value: chronic },
      { label: "Antecedentes hereditarios", value: hereditary },
      { label: "Hábitos", value: history?.non_pathological || EMPTY },
    ];
  }, [patient]);

  // Se ordena por fecha antes de tomar la última: el $push de patientsController no garantiza
  // que la toma más reciente quede al final del arreglo
  const lastVitals = useMemo(() => {
    const signs = patient?.clinical_history?.vital_signs;
    if (!signs?.length) return null;
    return [...signs]
      .sort((a, b) => new Date(a.last_date_taken) - new Date(b.last_date_taken))
      .at(-1);
  }, [patient]);

  const vitalsInfo = useMemo(() => {
    if (!lastVitals) return null;
    return [
      { label: "Presión arterial", value: lastVitals.blood_pressure || EMPTY },
      { label: "Glucosa", value: lastVitals.glucosa_mgdl ? `${lastVitals.glucosa_mgdl} mg/dL` : EMPTY },
      { label: "Peso", value: lastVitals.weight ? `${lastVitals.weight} kg` : EMPTY },
      { label: "IMC", value: lastVitals.imc ? String(lastVitals.imc) : EMPTY },
    ];
  }, [lastVitals]);

  const accountInfo = useMemo(() => [
    {
      icon: "lock-closed-outline",
      label: "Cambiar contraseña",
      chevron: true,
      onPress: () => navigation.navigate("ChangePassword"),
    },
    {
      icon: "notifications-outline",
      label: "Configuración de notificaciones",
      chevron: true,
      onPress: () => console.log("Pressed: notificaciones"),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacidad y datos",
      chevron: true,
      onPress: () => console.log("Pressed: privacidad"),
    },
    {
      icon: "log-out-outline",
      label: "Cerrar sesión",
      chevron: true,
      danger: true,
      onPress: handleLogout,
    },
  ], [navigation, handleLogout]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadProfile({ silent: true }); }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <ProfileCard
              patient={patient}
              onEdit={() => navigation.navigate("EditProfile", { patient })}
            />

            <Text style={styles.sectionTitle}>Atajos rápidos</Text>
            <View style={styles.shortcuts}>
              {shortcuts.map((s) => (
                <ShortcutCard
                  key={s.title}
                  icon={s.icon}
                  title={s.title}
                  onPress={() =>
                    s.screen ? navigation.navigate(s.screen) : console.log("Pressed:", s.title)
                  }
                />
              ))}
            </View>

            <InfoCard
              title="Información personal"
              items={personalInfo.map((i) => ({
                ...i,
                onPress: () => navigation.navigate("EditProfile", { patient }),
              }))}
            />

            <InfoCard
              title="Resumen de salud"
              layout="inline"
              items={healthInfo}
              footer={{
                label: "Ver información completa",
                onPress: () => navigation.navigate("HealthInfo", { patient }),
              }}
            />

            {vitalsInfo ? (
              <InfoCard
                title={`Últimos signos vitales · ${dateLabel(lastVitals.last_date_taken)}`}
                layout="inline"
                items={vitalsInfo}
              />
            ) : null}

            <InfoCard title="Cuenta y seguridad" items={accountInfo} />
          </>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
};

export default ProfileScreen;