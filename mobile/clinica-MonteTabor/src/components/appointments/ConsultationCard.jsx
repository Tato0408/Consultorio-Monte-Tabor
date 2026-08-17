import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { badgeTones, statusTones } from "../../styles/appointments/appointmentsStyle";
import { colors } from "../../styles/profile/profileStyle";
import { formatLongDate, formatTime12h } from "../../utils/date";

const BADGE_ORDER = ["prescription", "referral", "sickLeave"];

const DoctorAvatar = ({ uri }) =>
  uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Ionicons name="person" size={20} color={colors.primary} />
    </View>
  );

/** item: shape devuelto por GET /patientAccount/consultations */
const ConsultationCard = ({ item, onPress }) => {
  const tone = statusTones[item.status] || statusTones.pending;
  const doctorName = item.doctor
    ? `Dr. ${item.doctor.name} ${item.doctor.last_name}`.trim()
    : "Doctor sin asignar";
  const activeBadges = BADGE_ORDER.filter((key) => item.badges?.[key]);
  const isAttended = item.status === "completed";

  return (
    <TouchableOpacity style={styles.card} activeOpacity={onPress ? 0.75 : 1} onPress={onPress} disabled={!onPress}>
      <View style={styles.cardTopRow}>
        <View style={styles.dateTimeGroup}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.dateTimeText}>{formatLongDate(item.date)}</Text>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={[styles.dateTimeText, { marginRight: 0 }]}>{formatTime12h(item.start_time)}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusPillText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>

      <View style={styles.doctorRow}>
        <DoctorAvatar uri={item.doctor?.img_url} />
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctorName}</Text>
          {item.doctor?.specialty ? (
            <Text style={styles.doctorSpecialty}>{item.doctor.specialty}</Text>
          ) : null}
        </View>
      </View>

      {isAttended ? (
        <>
          <View style={styles.divider} />

          <View>
            <View style={styles.diagnosisHeader}>
              <Text style={styles.diagnosisLabel}>Diagnóstico</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
            <Text style={styles.diagnosisText}>
              {item.diagnosis || "Sin diagnóstico registrado"}
            </Text>
          </View>

          {activeBadges.length ? (
            <View style={styles.badgesRow}>
              {activeBadges.map((key) => {
                const badge = badgeTones[key];
                return (
                  <View key={key} style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon} size={13} color={badge.fg} />
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {onPress ? (
            <View style={styles.detailHint}>
              <Text style={styles.detailHintText}>Ver consulta</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.divider} />
          <View style={styles.pendingNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.pendingNoticeText}>
              {item.status === "cancelled"
                ? "Esta cita fue cancelada."
                : "Esta cita aún no ha sido atendida."}
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

export default ConsultationCard;
