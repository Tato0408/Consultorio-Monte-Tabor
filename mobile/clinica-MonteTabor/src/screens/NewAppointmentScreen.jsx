import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import apiClient from "../lib/apiClient";
import { showError } from "../lib/toast";
import styles from "../styles/newAppointmentStyle";

const GENERAL_SERVICE = { _id: "general", name: "Consulta Médica General", estimated_duration: 30, price: 15 };
const STEP_LABELS = ["Especialidad", "Fecha y hora", "Confirmación"];
const SERVICE_ICONS = ["medkit-outline", "heart-outline", "fitness-outline", "bandage-outline", "flask-outline"];

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const longDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const getCurrentWeek = () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sunday = new Date(today); sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
  const days = [];
  for (const current = new Date(today); current <= sunday; current.setDate(current.getDate() + 1)) days.push(new Date(current));
  return days;
};

const Stepper = ({ step }) => (
  <View style={styles.stepper}>
    {STEP_LABELS.map((label, index) => {
      const number = index + 1;
      const complete = number < step;
      const active = number === step;
      return (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, (active || complete) && styles.stepCircleActive]}>
              {complete ? <Ionicons name="checkmark" size={14} color="#FFF" /> : <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
          {index < STEP_LABELS.length - 1 ? <View style={[styles.stepLine, complete && styles.stepLineActive]} /> : null}
        </React.Fragment>
      );
    })}
  </View>
);

const SummaryRow = ({ icon, label, value }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIcon}><Ionicons name={icon} size={18} color="#5368D9" /></View>
    <View style={styles.summaryText}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  </View>
);

export default function NewAppointmentScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([GENERAL_SERVICE]);
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const week = useMemo(getCurrentWeek, []);
  const selectedService = services.find((service) => service._id === selectedId);
  const selectedSlot = slots.find((slot) => slot.start_time === selectedTime);

  useEffect(() => {
    apiClient("/appointments/patient/procedures")
      .then((response) => setServices([GENERAL_SERVICE, ...(response.data || [])]))
      .catch((error) => showError(error.message || "No se pudieron cargar los servicios."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (step !== 2 || !selectedId) return;
    setSlotsLoading(true);
    setSelectedTime("");
    apiClient("/schedule/patient-available-slots", { params: { date, procedure_id: selectedId } })
      .then((response) => setSlots(response.slots || []))
      .catch((error) => { setSlots([]); showError(error.message || "No se pudo consultar la disponibilidad."); })
      .finally(() => setSlotsLoading(false));
  }, [date, selectedId, step]);

  const next = () => {
    if (step === 1 && !selectedService) return showError("Selecciona el tipo de consulta.");
    if (step === 2 && !selectedSlot) return showError("Selecciona un horario disponible.");
    setStep((current) => Math.min(current + 1, 3));
  };

  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep((current) => current - 1);
  };

  const save = async () => {
    if (description.trim() && description.trim().length < 3) return showError("El motivo debe tener al menos 3 caracteres.");
    setSaving(true);
    try {
      await apiClient("/appointments/patient", {
        method: "POST",
        body: {
          procedure_id: selectedId,
          date: `${date}T00:00:00.000Z`,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          description: description.trim(),
        },
      });
      setSuccess(true);
    } catch (error) {
      showError(error.message || "No se pudo agendar la cita.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successCircle}><Ionicons name="checkmark" size={45} color="#FFF" /></View>
          <Text style={styles.successTitle}>¡Cita solicitada con éxito!</Text>
          <Text style={styles.successText}>Tu solicitud quedó pendiente. Un doctor podrá aceptarla y verás cualquier cambio en Consultas.</Text>
          <View style={styles.summaryCard}>
            <SummaryRow icon="medkit-outline" label="Servicio" value={selectedService.name} />
            <SummaryRow icon="calendar-outline" label="Fecha" value={longDate(date)} />
            <SummaryRow icon="time-outline" label="Hora" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
            <SummaryRow icon="hourglass-outline" label="Estado" value="Pendiente de asignación" />
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Appointments")}>
            <Ionicons name="calendar-outline" size={18} color="#2F6BFF" />
            <Text style={styles.secondaryButtonText}>Ver mis consultas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Dashboard")}>
            <Text style={styles.primaryButtonText}>Ir al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const filteredServices = services.filter((service) => service.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerButton}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Agendar cita</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="close" size={23} color="#111827" /></TouchableOpacity>
      </View>
      <Stepper step={step} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text style={styles.title}>¿Qué tipo de consulta necesitas?</Text>
            <Text style={styles.subtitle}>Selecciona el servicio médico</Text>
            <View style={styles.searchBox}>
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar servicio" placeholderTextColor="#94A3B8" style={styles.searchInput} />
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
            </View>
            {loading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : filteredServices.map((service, index) => (
              <TouchableOpacity key={service._id} style={[styles.serviceCard, selectedId === service._id && styles.serviceCardSelected]} onPress={() => setSelectedId(service._id)}>
                <View style={styles.serviceIcon}><Ionicons name={SERVICE_ICONS[index % SERVICE_ICONS.length]} size={21} color="#5368D9" /></View>
                <View style={styles.serviceText}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceMeta}>{service.estimated_duration || 30} min · {money(service.price)}</Text>
                </View>
                <Ionicons name={selectedId === service._id ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedId === service._id ? "#2F6BFF" : "#111827"} />
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.title}>Elige la fecha y hora</Text>
            <Text style={styles.subtitle}>Mostramos horarios donde hay al menos un doctor disponible</Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Selecciona fecha</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {week.map((day) => {
                  const key = toDateKey(day); const active = key === date;
                  return <TouchableOpacity key={key} style={[styles.day, active && styles.dayActive]} onPress={() => setDate(key)}>
                    <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", "")}</Text>
                    <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
                  </TouchableOpacity>;
                })}
              </ScrollView>
              <Text style={[styles.panelTitle, styles.timeTitle]}>Selecciona hora</Text>
              {slotsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : slots.length ? (
                <View style={styles.slots}>{slots.map((slot) => (
                  <TouchableOpacity key={slot.start_time} style={[styles.slot, selectedTime === slot.start_time && styles.slotActive]} onPress={() => setSelectedTime(slot.start_time)}>
                    <Text style={[styles.slotText, selectedTime === slot.start_time && styles.slotTextActive]}>{slot.start_time}</Text>
                  </TouchableOpacity>
                ))}</View>
              ) : <View style={styles.noSlots}><Ionicons name="time-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha.</Text></View>}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.title}>Confirma los detalles de tu cita</Text>
            <Text style={styles.subtitle}>Revisa que la información sea correcta</Text>
            <View style={styles.summaryCard}>
              <SummaryRow icon="medkit-outline" label="Servicio" value={selectedService.name} />
              <SummaryRow icon="calendar-outline" label="Fecha" value={longDate(date)} />
              <SummaryRow icon="time-outline" label="Hora" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
              <SummaryRow icon="cash-outline" label="Costo" value={money(selectedService.price)} />
              <SummaryRow icon="hourglass-outline" label="Estado inicial" value="Pendiente de asignación" />
            </View>
            <Text style={styles.inputLabel}>Motivo de la consulta <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Cuéntanos brevemente el motivo de tu consulta"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              style={styles.textarea}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity disabled={saving} style={[styles.primaryButton, ((step === 1 && !selectedService) || (step === 2 && !selectedSlot) || saving) && styles.buttonDisabled]} onPress={step === 3 ? save : next}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{step === 3 ? "Confirmar cita" : "Continuar"}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
