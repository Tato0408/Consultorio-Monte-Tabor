import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import styles from "../../styles/profile/healthStyle";
import { colors } from "../../styles/profile/profileStyle";

// Compatibilidad transfusional estándar del sistema ABO/Rh
const COMPATIBILITY = {
  "O-":  { donateTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], receiveFrom: ["O-"] },
  "O+":  { donateTo: ["O+", "A+", "B+", "AB+"], receiveFrom: ["O+", "O-"] },
  "A-":  { donateTo: ["A-", "A+", "AB-", "AB+"], receiveFrom: ["A-", "O-"] },
  "A+":  { donateTo: ["A+", "AB+"], receiveFrom: ["A+", "A-", "O+", "O-"] },
  "B-":  { donateTo: ["B-", "B+", "AB-", "AB+"], receiveFrom: ["B-", "O-"] },
  "B+":  { donateTo: ["B+", "AB+"], receiveFrom: ["B+", "B-", "O+", "O-"] },
  "AB-": { donateTo: ["AB-", "AB+"], receiveFrom: ["AB-", "A-", "B-", "O-"] },
  "AB+": { donateTo: ["AB+"], receiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] },
};

const describe = (type) => {
  const group = type.replace(/[+-]$/, "");
  const rh = type.endsWith("+") ? "positivo" : "negativo";
  const antigen =
    group === "O"
      ? "no tiene antígenos A ni B"
      : group === "AB"
      ? "tiene los antígenos A y B"
      : `tiene el antígeno ${group}`;
  return `${type} significa que tu sangre ${antigen} y que el factor Rh es ${rh}.`;
};

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-SV", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      })
    : null;

const Chips = ({ label, values }) => (
  <>
    <Text style={styles.groupLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {values.map((item) => (
        <View key={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  </>
);

const BloodTypeScreen = ({ navigation }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      // getMe devuelve el paciente directo, sin envolverlo en { data }
      const response = await apiClient("/patientAccount/me");
      setPatient(response || null);
    } catch (error) {
      showError(error.message || "No se pudo cargar tu información.");
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect y no useEffect: al volver de guardar, el dato nuevo se refleja solo
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const bloodType = patient?.clinical_history?.blood_type;
  const registeredAt = dateLabel(patient?.clinical_history?.blood_type_date);
  const compatibility = bloodType ? COMPATIBILITY[bloodType] : null;
  // true solo cuando lo confirmó personal clínico en una consulta (ver
  // BloodTypeCard.jsx en el panel privado); autoreportarlo desde acá
  // siempre lo deja en false.
  const verified = !!patient?.clinical_history?.blood_type_verified;

  const goToForm = () =>
    navigation.navigate("AddBloodType", { current: bloodType });

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
        <Text style={styles.headerTitle}>Tipo de sangre</Text>
        <View style={styles.headerSide} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : !bloodType ? (
        // Sin registro todavía: se manda directo al formulario
        <View style={styles.flex}>
          <View style={styles.empty}>
            <View style={styles.dropCircle}>
              <Ionicons name="water" size={38} color="#DC2626" />
            </View>
            <Text style={styles.emptyTitle}>Aún no registras tu tipo de sangre</Text>
            <Text style={styles.emptyText}>
              Es información vital en caso de una emergencia médica. Regístralo para que
              aparezca en tu perfil.
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={goToForm}>
              <Text style={styles.primaryButtonText}>Registrar tipo de sangre</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.dropCircle}>
                <Ionicons name="water" size={38} color="#DC2626" />
              </View>
              <Text style={styles.heroLabel}>Tu tipo de sangre</Text>
              <Text style={styles.heroValue}>{bloodType}</Text>
              <View
                style={{
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: verified ? "#ECFDF5" : "#FFFBEB",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: verified ? "#047857" : "#B45309" }}>
                  {verified ? "Confirmado por personal clínico" : "Autoreportado, sin confirmar"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>¿Qué significa?</Text>
              <Text style={styles.cardText}>{describe(bloodType)}</Text>
            </View>

            {compatibility ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Compatibilidad</Text>
                <Chips label="Puedes donar a" values={compatibility.donateTo} />
                <Chips label="Puedes recibir de" values={compatibility.receiveFrom} />
              </View>
            ) : null}

            {registeredAt ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Fecha de registro</Text>
                <Text style={styles.registeredLabel}>Registrado el</Text>
                <Text style={styles.registeredValue}>{registeredAt}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={goToForm}>
              <Text style={styles.primaryButtonText}>Actualizar tipo de sangre</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default BloodTypeScreen;