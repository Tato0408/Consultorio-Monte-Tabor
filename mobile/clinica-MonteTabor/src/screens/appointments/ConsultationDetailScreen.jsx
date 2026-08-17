import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import { formatLongDate, formatTime12h } from "../../utils/date";
import { badgeTones } from "../../styles/appointments/appointmentsStyle";
import styles from "../../styles/appointments/consultationDetailStyle";

const VITALS = [
  { key: "blood_pressure", label: "Presión arterial", unit: "" },
  { key: "temperature", label: "Temperatura", unit: "°C" },
  { key: "glucose", label: "Glucosa", unit: "mg/dL" },
  { key: "oxygen_saturation", label: "Saturación O₂", unit: "%" },
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "height", label: "Talla", unit: "cm" },
];

const EXAM_FIELDS = [
  { key: "general", label: "General" },
  { key: "skin", label: "Piel" },
  { key: "cardiopulmonary", label: "Cardiopulmonar" },
  { key: "abdomen", label: "Abdomen" },
  { key: "neurological", label: "Neurológico" },
  { key: "musculoskeletal", label: "Musculoesquelético" },
  { key: "notes", label: "Notas" },
];

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIcon}><Ionicons name={icon} size={18} color="#2F6BFF" /></View>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const Section = ({ icon, title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={16} color="#2F6BFF" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

export default function ConsultationDetailScreen({ navigation, route }) {
  const { consultationId } = route.params || {};
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!consultationId) {
      showError("No se recibió la consulta.");
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient(`/patientAccount/consultations/${consultationId}`);
      setConsultation(response);
    } catch (error) {
      showError(error.message || "No se pudo cargar la consulta.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [consultationId, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !consultation) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const appointment = consultation.appointment_id;
  const doctor = appointment?.doctor_id;
  const initials = doctor ? `${doctor.name?.[0] || ""}${doctor.last_name?.[0] || ""}` : "?";

  const clinicalData = consultation.clinical_data || {};
  const triage = clinicalData.triage || {};
  const hasVitals = VITALS.some((v) => triage[v.key] !== undefined && triage[v.key] !== null && triage[v.key] !== "");

  const physicalExam = consultation.physical_exam || {};
  const examRows = EXAM_FIELDS.filter((f) => String(physicalExam[f.key] || "").trim() !== "");

  const procedures = (consultation.procedure || []).filter((p) => p.procedure_name);

  const prescription = consultation.prescription;
  const hasMedications = Boolean(prescription?.medications?.length);
  const hasLabOrders = Boolean(prescription?.lab_orders?.length);
  const hasPostOpInstructions = Boolean(prescription?.post_operative_instructions?.trim());
  const hasPrescription = hasMedications || hasLabOrders || hasPostOpInstructions;

  const referral = consultation.referral;
  const hasReferral = Boolean(referral?.reason?.trim());

  const sickLeave = consultation.sickLeave;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de la consulta</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {doctor?.img_url ? (
            <Image source={{ uri: doctor.img_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>
          )}
          <View style={styles.doctorText}>
            <Text style={styles.doctorName}>{doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}` : "Doctor sin asignar"}</Text>
            <Text style={styles.specialty}>{doctor?.specialty || "Consulta médica"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "#DDF8F0" }]}>
            <Text style={[styles.statusText, { color: "#16836B" }]}>Atendida</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <DetailItem icon="calendar-outline" label="Fecha" value={appointment ? formatLongDate(appointment.date) : "—"} />
          <DetailItem icon="time-outline" label="Horario" value={appointment ? formatTime12h(appointment.start_time) : "—"} />
          <DetailItem icon="medkit-outline" label="Servicio" value={appointment?.type || "—"} />
        </View>

        <Section icon="clipboard-outline" title="Diagnóstico">
          <Text style={styles.sectionText}>
            {clinicalData.diagnosis_description || clinicalData.diagnosis || "Sin diagnóstico registrado."}
          </Text>
          {clinicalData.diagnosis && clinicalData.diagnosis_description ? (
            <View style={[styles.examRow, { marginTop: 10 }]}>
              <Text style={styles.examLabel}>Diagnóstico (CIE)</Text>
              <Text style={styles.examValue}>{clinicalData.diagnosis}{clinicalData.icd_diagnosis ? ` · ${clinicalData.icd_diagnosis}` : ""}</Text>
            </View>
          ) : null}
          {clinicalData.evolution ? (
            <View style={[styles.examRow, styles.examRowLast, { marginTop: 10 }]}>
              <Text style={styles.examLabel}>Evolución</Text>
              <Text style={styles.examValue}>{clinicalData.evolution}</Text>
            </View>
          ) : null}
        </Section>

        {hasVitals ? (
          <Section icon="pulse-outline" title="Signos vitales">
            <View style={styles.vitalsGrid}>
              {VITALS.filter((v) => triage[v.key] !== undefined && triage[v.key] !== null && triage[v.key] !== "").map((v) => (
                <View key={v.key} style={styles.vitalChip}>
                  <Text style={styles.vitalChipLabel}>{v.label}</Text>
                  <Text style={styles.vitalChipValue}>{triage[v.key]}{v.unit ? ` ${v.unit}` : ""}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {examRows.length ? (
          <Section icon="body-outline" title="Examen físico">
            {examRows.map((f, index) => (
              <View key={f.key} style={index === examRows.length - 1 ? styles.examRowLast : styles.examRow}>
                <Text style={styles.examLabel}>{f.label}</Text>
                <Text style={styles.examValue}>{physicalExam[f.key]}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {procedures.length ? (
          <Section icon="cut-outline" title="Procedimientos realizados">
            {procedures.map((p, index) => (
              <View key={String(p.procedure_id) + index} style={[styles.listItem, index === procedures.length - 1 && styles.listItemLast]}>
                <View style={styles.listItemDot} />
                <Text style={styles.listItemTitle}>{p.procedure_name}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {hasPrescription ? (
          <Section icon="document-text-outline" title="Receta médica">
            {hasMedications && prescription.medications.map((med, index) => (
              <View key={index} style={index === prescription.medications.length - 1 && !hasLabOrders && !hasPostOpInstructions ? styles.medicationRowLast : styles.medicationRow}>
                <Text style={styles.medicationName}>{med.name}</Text>
                <View style={styles.medicationMetaRow}>
                  {med.dose ? <Text style={styles.medicationMeta}>Dosis: {med.dose}</Text> : null}
                  {med.frequency ? <Text style={styles.medicationMeta}>Frecuencia: {med.frequency}</Text> : null}
                  {med.duration ? <Text style={styles.medicationMeta}>Duración: {med.duration}</Text> : null}
                </View>
                {med.route_of_administration ? <Text style={styles.medicationInstructions}>Vía: {med.route_of_administration}</Text> : null}
                {med.instructions ? <Text style={styles.medicationInstructions}>{med.instructions}</Text> : null}
              </View>
            ))}

            {hasLabOrders && prescription.lab_orders.map((lab, index) => (
              <View key={`lab-${index}`} style={index === prescription.lab_orders.length - 1 && !hasPostOpInstructions ? styles.medicationRowLast : styles.medicationRow}>
                <Text style={styles.medicationName}>{lab.test_name}</Text>
                {lab.notes ? <Text style={styles.medicationInstructions}>{lab.notes}</Text> : null}
              </View>
            ))}

            {hasPostOpInstructions ? (
              <View style={styles.medicationRowLast}>
                <Text style={styles.examLabel}>Indicaciones</Text>
                <Text style={styles.examValue}>{prescription.post_operative_instructions}</Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {hasReferral ? (
          <Section icon="swap-horizontal-outline" title="Referencia">
            <View style={styles.examRow}>
              <Text style={styles.examLabel}>Motivo</Text>
              <Text style={styles.examValue}>{referral.reason}</Text>
            </View>
            {referral.referred_to ? (
              <View style={styles.examRow}>
                <Text style={styles.examLabel}>Referido a</Text>
                <Text style={styles.examValue}>{referral.referred_to}</Text>
              </View>
            ) : null}
            {referral.referred_date ? (
              <View style={styles.examRowLast}>
                <Text style={styles.examLabel}>Fecha</Text>
                <Text style={styles.examValue}>{formatLongDate(referral.referred_date)}</Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {sickLeave ? (
          <Section icon="id-card-outline" title="Incapacidad">
            <View style={styles.examRow}>
              <Text style={styles.examLabel}>Vigencia</Text>
              <Text style={styles.examValue}>
                {sickLeave.start_date ? formatLongDate(sickLeave.start_date) : "—"} – {sickLeave.end_date ? formatLongDate(sickLeave.end_date) : "—"}
              </Text>
            </View>
            {sickLeave.diagnosis ? (
              <View style={styles.examRowLast}>
                <Text style={styles.examLabel}>Diagnóstico</Text>
                <Text style={styles.examValue}>{sickLeave.diagnosis}</Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {consultation.follow_up_date ? (
          <Section icon="calendar-clear-outline" title="Próximo control">
            <Text style={styles.sectionText}>{formatLongDate(consultation.follow_up_date)}</Text>
          </Section>
        ) : null}

        {(hasMedications || hasReferral || sickLeave) ? (
          <View style={styles.badgesRow}>
            {hasMedications ? (
              <View style={[styles.badge, { backgroundColor: badgeTones.prescription.bg }]}>
                <Ionicons name={badgeTones.prescription.icon} size={13} color={badgeTones.prescription.fg} />
                <Text style={[styles.badgeText, { color: badgeTones.prescription.fg }]}>{badgeTones.prescription.label}</Text>
              </View>
            ) : null}
            {hasReferral ? (
              <View style={[styles.badge, { backgroundColor: badgeTones.referral.bg }]}>
                <Ionicons name={badgeTones.referral.icon} size={13} color={badgeTones.referral.fg} />
                <Text style={[styles.badgeText, { color: badgeTones.referral.fg }]}>{badgeTones.referral.label}</Text>
              </View>
            ) : null}
            {sickLeave ? (
              <View style={[styles.badge, { backgroundColor: badgeTones.sickLeave.bg }]}>
                <Ionicons name={badgeTones.sickLeave.icon} size={13} color={badgeTones.sickLeave.fg} />
                <Text style={[styles.badgeText, { color: badgeTones.sickLeave.fg }]}>{badgeTones.sickLeave.label}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
