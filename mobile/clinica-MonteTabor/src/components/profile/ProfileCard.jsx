import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/profile/profileStyle";

// Edad calculada en UTC: con la hora local, un nacimiento guardado a medianoche se
// interpreta un día antes en El Salvador (UTC-6) y el cumpleaños se corre
const getAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const getInitials = (name, lastName) => {
  const first = name?.trim()?.[0] || "";
  const second = lastName?.trim()?.[0] || "";
  return `${first}${second}`.toUpperCase() || "?";
};

const ProfileCard = ({ patient, onEdit }) => {
  const fullName = [patient?.name, patient?.last_name].filter(Boolean).join(" ") || "Paciente";
  const age = getAge(patient?.birth_date);
  const bloodType = patient?.clinical_history?.blood_type;

  // "32 años · Femenino", omitiendo lo que no esté registrado
  const meta = [age !== null ? `${age} años` : null, patient?.gender]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileTop}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {getInitials(patient?.name, patient?.last_name)}
            </Text>
          </View>
        </View>

        <View style={styles.profileTexts}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          {meta ? <Text style={styles.info}>{meta}</Text> : null}
          {patient?.email ? (
            <Text style={styles.info} numberOfLines={1}>{patient.email}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.badgeRow}>
        {bloodType ? (
          <View style={styles.badge}>
            <Ionicons name="water" size={12} color="#fff" />
            <Text style={styles.badgeText}>{bloodType}</Text>
          </View>
        ) : null}

        <View style={styles.badge}>
          <Ionicons
            name={patient?.is_verified ? "checkmark-circle" : "alert-circle"}
            size={12}
            color="#fff"
          />
          <Text style={styles.badgeText}>
            {patient?.is_verified ? "Cuenta verificada" : "Sin verificar"}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.editButton} activeOpacity={0.85} onPress={onEdit}>
        <Text style={styles.editButtonText}>Editar perfil</Text>
        <Ionicons name="create-outline" size={17} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default ProfileCard;