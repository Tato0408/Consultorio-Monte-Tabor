import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import BottomNav from "../components/BottomNav";
import NotificationBell from "../components/NotificationBell";
import { ErrorState } from "../components/common/ScreenState";
import apiClient from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";
import { statusTones } from "../styles/appointments/appointmentsStyle";
import { formatLongDate, formatTime12h } from "../utils/date";
import styles, { colors } from "../styles/dashboardStyle";

// Mismo flujo real de NewAppointmentScreen.jsx (Especialidad -> Fecha y hora -> Confirmación,
// sin selección de doctor: se asigna después al aceptarla), no el de un mockup genérico.
const STEPS = [
  { icon: "medkit-outline", title: "Elige el servicio", text: "Selecciona el tipo de consulta" },
  { icon: "time-outline", title: "Fecha y hora", text: "Elige el día que más te convenga" },
  { icon: "checkmark-circle-outline", title: "Confirma", text: "Revisa los datos y confirma" },
  { icon: "hourglass-outline", title: "¡Listo!", text: "Un doctor la acepta pronto" },
];

const BENEFITS = [
  { icon: "time-outline", title: "Ahorra tiempo", text: "Evita filas y esperas innecesarias" },
  { icon: "notifications-outline", title: "Recordatorios", text: "Te notificamos antes de tu cita" },
  { icon: "shield-checkmark-outline", title: "Atención personalizada", text: "Recibe el mejor cuidado" },
  { icon: "document-text-outline", title: "Acceso a tus documentos", text: "Recetas, referencias e incapacidades" },
];

const getInitials = (name, lastName) =>
  `${name?.trim()?.[0] || ""}${lastName?.trim()?.[0] || ""}`.toUpperCase() || "?";

// Medianoche UTC de hoy: el backend guarda "date" como medianoche UTC del día de la cita
// (ver utils/date.js), así que comparar contra un "hoy" armado con los getters UTC evita que
// una cita de hoy se lea como pasada en cualquier huso horario detrás de UTC.
const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const DoctorAvatar = ({ uri }) =>
  uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Ionicons name="person" size={20} color={colors.primary} />
    </View>
  );

const QuickAction = ({ icon, library, label, sub, onPress }) => (
  <TouchableOpacity style={styles.quickCard} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.quickIconWrap}>
      {library === "material" ? (
        <MaterialCommunityIcons name={icon} size={19} color={colors.primary} />
      ) : (
        <Ionicons name={icon} size={19} color={colors.primary} />
      )}
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
    <Text style={styles.quickSub} numberOfLines={1}>{sub}</Text>
  </TouchableOpacity>
);

// Solo se muestra a quien nunca ha agendado una cita (ver hasBookedBefore en DashboardScreen);
// desaparece en cuanto exista al menos una cita registrada, propia o hecha antes.
const OnboardingCard = ({ onPress }) => (
  <TouchableOpacity style={styles.onboardingCard} activeOpacity={0.9} onPress={onPress}>
    <View style={styles.onboardingTexts}>
      <Text style={styles.onboardingTitle}>¿Primera vez o deseas agendar una nueva cita?</Text>
      <Text style={styles.onboardingText}>Elige el servicio, la fecha y el horario de forma rápida y sencilla</Text>
      <View style={styles.onboardingButton}>
        <Text style={styles.onboardingButtonText}>Agendar cita</Text>
        <Ionicons name="add" size={16} color={colors.primary} />
      </View>
    </View>
    <View style={styles.onboardingIllustration}>
      <Ionicons name="calendar" size={26} color="#FFF" />
    </View>
  </TouchableOpacity>
);

const StepsCard = () => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>¿Cómo agendar tu cita?</Text>
    <View style={styles.stepsRow}>
      {STEPS.map((step, index) => (
        <View key={step.title} style={styles.stepCol}>
          <View style={styles.stepCircleWrap}>
            <View style={styles.stepCircle}>
              <Ionicons name={step.icon} size={17} color={colors.primary} />
            </View>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepText}>{step.text}</Text>
        </View>
      ))}
    </View>
  </View>
);

const BenefitsCard = () => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Beneficios de agendar tu cita</Text>
    <View style={styles.benefitsGrid}>
      {BENEFITS.map((benefit) => (
        <View key={benefit.title} style={styles.benefitCol}>
          <View style={styles.benefitIconWrap}>
            <Ionicons name={benefit.icon} size={17} color={colors.primary} />
          </View>
          <Text style={styles.benefitTitle}>{benefit.title}</Text>
          <Text style={styles.benefitText}>{benefit.text}</Text>
        </View>
      ))}
    </View>
  </View>
);

const NextAppointmentCard = ({ appointment, onBook, onDetail, onReschedule }) => {
  if (!appointment) {
    return (
      <View style={styles.appointmentCard}>
        <Text style={styles.cardHeaderTitle}>Próxima cita</Text>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={24} color={colors.muted} />
          </View>
          <Text style={styles.emptyStateText}>Aún no tienes una cita programada, ¿Quieres agendar una?</Text>
          <TouchableOpacity style={styles.emptyStateButton} activeOpacity={0.85} onPress={onBook}>
            <Text style={styles.emptyStateButtonText}>Agendar cita</Text>
            <Ionicons name="add" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tone = statusTones[appointment.status] || statusTones.pending;
  const doctorName = appointment.doctor
    ? `Dr. ${appointment.doctor.name} ${appointment.doctor.last_name}`.trim()
    : "Esperando asignación de doctor";

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Próxima cita</Text>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusPillText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>

      <View style={styles.doctorRow}>
        <DoctorAvatar uri={appointment.doctor?.img_url} />
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctorName}</Text>
          {appointment.doctor?.specialty ? (
            <Text style={styles.doctorSpecialty}>{appointment.doctor.specialty}</Text>
          ) : null}
        </View>
      </View>

      {/* Fecha y hora en dos mitades exactamente iguales del ancho de la card (sin "Lugar") */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeCol}>
          <View style={styles.dateTimeIconWrap}><Ionicons name="calendar-outline" size={15} color={colors.primary} /></View>
          <View>
            <Text style={styles.dateTimeColLabel}>Fecha</Text>
            <Text style={styles.dateTimeColValue}>{formatLongDate(appointment.date)}</Text>
          </View>
        </View>
        <View style={styles.dateTimeDivider} />
        <View style={styles.dateTimeCol}>
          <View style={styles.dateTimeIconWrap}><Ionicons name="time-outline" size={15} color={colors.primary} /></View>
          <View>
            <Text style={styles.dateTimeColLabel}>Hora</Text>
            <Text style={styles.dateTimeColValue}>{formatTime12h(appointment.start_time)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.outlineButton} activeOpacity={0.8} onPress={onDetail}>
          <Ionicons name="information-circle-outline" size={16} color={colors.text} />
          <Text style={styles.outlineButtonText}>Ver detalles</Text>
        </TouchableOpacity>
        {/* Reagendar reusa el registro de la cita (conserva el anticipo) y la deja de
            nuevo pendiente de aceptación. El endpoint solo admite citas pendientes o por
            reagendar; una cita ya aceptada (scheduled) se gestiona desde su detalle. */}
        <TouchableOpacity
          style={styles.primaryButtonSmall}
          activeOpacity={0.85}
          onPress={appointment.status === "scheduled" ? onDetail : onReschedule}
        >
          <Ionicons name="calendar-outline" size={16} color="#FFF" />
          <Text style={styles.primaryButtonSmallText}>Reagendar cita</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LastConsultationCard = ({ item, onHistory, onMore }) => {
  const doctorName = item.doctor
    ? `Dr. ${item.doctor.name} ${item.doctor.last_name}`.trim()
    : "Doctor sin asignar";

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Última consulta</Text>
        <TouchableOpacity style={styles.cardHeaderLink} activeOpacity={0.7} onPress={onHistory}>
          <Text style={styles.cardHeaderLinkText}>Ver historial</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.doctorRow}>
        <DoctorAvatar uri={item.doctor?.img_url} />
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctorName}</Text>
          {item.doctor?.specialty ? (
            <Text style={styles.doctorSpecialty}>{item.doctor.specialty}</Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: "#E6F7EE" }]}>
          <Text style={[styles.statusPillText, { color: "#16A34A" }]}>Consulta completada</Text>
        </View>
      </View>

      <View style={styles.consultDateTime}>
        <Ionicons name="calendar-outline" size={13} color={colors.muted} />
        <Text style={styles.consultDateTimeText}>{formatLongDate(item.date)}</Text>
        <Ionicons name="time-outline" size={13} color={colors.muted} />
        <Text style={[styles.consultDateTimeText, { marginRight: 0 }]}>{formatTime12h(item.start_time)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.diagnosisBox}>
        <Text style={styles.diagnosisLabel}>Diagnóstico</Text>
        <Text style={styles.diagnosisText}>{item.diagnosis || "Sin diagnóstico registrado"}</Text>
      </View>

      {item.consultation_id ? (
        <TouchableOpacity style={styles.moreLink} activeOpacity={0.7} onPress={onMore}>
          <Text style={styles.moreLinkText}>Ver más</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mismo endpoint que useMyConsultations (GET /patientAccount/consultations): trae TODAS las
  // citas del paciente, cruzadas con su consulta si ya fue atendida, en un solo viaje. Se
  // recarga en cada foco (no solo al montar) para que la card de bienvenida desaparezca de
  // inmediato apenas el paciente registre su primera cita, sin tener que reabrir la app.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setError(null);
      const data = await apiClient("/patientAccount/consultations");
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar tu información.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = () => { setRefreshing(true); load({ silent: true }); };

  const hasBookedBefore = consultations.length > 0;

  const nextAppointment = useMemo(() => {
    const today = todayUTC();
    const upcoming = consultations.filter(
      (item) => ["pending", "scheduled"].includes(item.status) && new Date(item.date) >= today
    );
    // La lista llega ordenada desc. por fecha (la más lejana primero); para "próxima cita" se
    // necesita la más cercana, así que se reordena asc. por fecha y hora antes de tomar la primera.
    upcoming.sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      return diff !== 0 ? diff : String(a.start_time || "").localeCompare(String(b.start_time || ""));
    });
    return upcoming[0] || null;
  }, [consultations]);

  const lastConsultation = useMemo(
    () => consultations.find((item) => item.status === "completed") || null,
    [consultations]
  );

  // Citas que quedaron "por reagendar": ningún profesional las aceptó a tiempo o el cupo
  // se le asignó a otro paciente. El paciente debe elegirles una nueva fecha/hora.
  const needsReschedule = useMemo(
    () => consultations.filter((item) => ["needs_reschedule", "expired"].includes(item.status)),
    [consultations]
  );

  const openNewAppointment = () => navigation.navigate("NewAppointment");
  // tabSwitch: true: navegar entre pestañas del BottomNav no debe animar (ver App.js/BottomNav.jsx).
  const openConsultationsTab = () => navigation.navigate("Appointments", { tabSwitch: true });
  const openMedicationsTab = () => navigation.navigate("Medications", { tabSwitch: true });
  const openHistory = () =>
    navigation.navigate("Appointments", { initialView: "consultations", navigationKey: Date.now(), tabSwitch: true });

  const displayName = user?.name || "Paciente";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {displayName}!</Text>
            <Text style={styles.subtitle}>¿Cómo podemos ayudarte hoy?</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Profile", { tabSwitch: true })}
            >
              <Text style={styles.avatarButtonText}>{getInitials(user?.name, user?.last_name)}</Text>
            </TouchableOpacity>
            <NotificationBell navigation={navigation} color={colors.text} />
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="calendar-outline" label="Agendar cita" sub="Nueva cita" onPress={openNewAppointment} />
          <QuickAction icon="document-text-outline" label="Mis consultas" sub="Historial" onPress={openConsultationsTab} />
          <QuickAction icon="pill" library="material" label="Mis medicinas" sub="Recordatorios" onPress={openMedicationsTab} />
        </View>

        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : !error ? (
          <>
            {!hasBookedBefore ? (
              <>
                <OnboardingCard onPress={openNewAppointment} />
                <StepsCard />
                <BenefitsCard />
              </>
            ) : null}

            {needsReschedule.length > 0 ? (
              <TouchableOpacity
                style={styles.rescheduleBanner}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Appointments", { tabSwitch: true })}
              >
                <View style={styles.rescheduleBannerIcon}>
                  <Ionicons name="alert-circle-outline" size={20} color="#C2410C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rescheduleBannerTitle}>
                    {needsReschedule.length === 1
                      ? "Tienes 1 cita por reagendar"
                      : `Tienes ${needsReschedule.length} citas por reagendar`}
                  </Text>
                  <Text style={styles.rescheduleBannerText}>Elige una nueva fecha y hora para no perder tu atención.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C2410C" />
              </TouchableOpacity>
            ) : null}

            <NextAppointmentCard
              appointment={nextAppointment}
              onBook={openNewAppointment}
              onDetail={() => navigation.navigate("AppointmentDetail", { appointmentId: nextAppointment.appointment_id })}
              onReschedule={() => navigation.navigate("NewAppointment", {
                reschedule: {
                  appointmentId: nextAppointment.appointment_id,
                  procedureIds: (nextAppointment.procedures || []).map((p) => p._id),
                },
              })}
            />

            {lastConsultation ? (
              <LastConsultationCard
                item={lastConsultation}
                onHistory={openHistory}
                onMore={() => navigation.navigate("ConsultationDetail", { consultationId: lastConsultation.consultation_id })}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <BottomNav navigation={navigation} active="Dashboard" onAddPress={openNewAppointment} />
    </SafeAreaView>
  );
};

export default DashboardScreen;
