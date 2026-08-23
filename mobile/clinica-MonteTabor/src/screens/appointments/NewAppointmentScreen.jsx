import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import { formatTime12h } from "../../utils/date";
import styles from "../../styles/appointments/newAppointmentStyle";

const GENERAL_SERVICE = { _id: "general", name: "Consulta Médica General", estimated_duration: 30, price: 15 };
const SERVICE_ICONS = ["medkit-outline", "heart-outline", "fitness-outline", "bandage-outline", "flask-outline"];
const PAYMENT_METHODS = [
  { key: "reception", icon: "wallet-outline", title: "Pagar en recepción", description: "Paga el total en efectivo o con tarjeta el día de tu cita." },
  { key: "online", icon: "card-outline", title: "Pagar anticipo en línea", description: "Aparta tu hora pagando el 50% ahora (modo de prueba con Wompi). El resto se paga en recepción." },
];

// Etiquetas del stepper según el modo elegido dentro del paso 2: en modo "rapido" (por
// defecto, igual a como funcionaba antes esta pantalla) la cita queda sin asignar y
// cualquier doctor disponible la puede aceptar. En modo "doctor" se elige doctor antes
// que la fecha, así que se agrega un paso más y la fecha/hora queda filtrada a los
// días y horas reales de ese doctor.
const STEP_LABELS_BY_MODE = {
  rapido: ["Especialidad", "Fecha y hora", "Confirmación"],
  doctor: ["Especialidad", "Doctor", "Fecha y hora", "Confirmación"],
};

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const longDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Días que se muestran en el selector de fecha: rango fijo hacia adelante desde hoy.
const UPCOMING_DAYS = 21;
const getUpcomingDays = () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < UPCOMING_DAYS; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    days.push(day);
  }
  return days;
};

const Stepper = ({ step, modo }) => {
  const labels = STEP_LABELS_BY_MODE[modo] || STEP_LABELS_BY_MODE.rapido;
  return (
    <View style={styles.stepper}>
      {labels.map((label, index) => {
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
            {index < labels.length - 1 ? <View style={[styles.stepLine, complete && styles.stepLineActive]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// Igual que StepFechaHora.jsx (web): horarios agrupados por franja según la hora de
// inicio, en el mismo orden Mañana/Tarde/Noche.
const FRANJAS = [
  { key: "manana", label: "Mañana", icon: "sunny-outline" },
  { key: "tarde", label: "Tarde", icon: "partly-sunny-outline" },
  { key: "noche", label: "Noche", icon: "moon-outline" },
];

const groupSlotsByFranja = (slots) => {
  const grupos = { manana: [], tarde: [], noche: [] };
  for (const s of slots) {
    const hora = Number(String(s.start_time).split(":")[0]);
    if (hora < 12) grupos.manana.push(s);
    else if (hora < 18) grupos.tarde.push(s);
    else grupos.noche.push(s);
  }
  return grupos;
};

// Cuadrícula de horarios agrupada por franja, con hora de inicio + hora de finalización
// en cada botón — mismo formato que usa el paso de fecha/hora en la web (StepFechaHora.jsx).
const SlotPicker = ({ slots, selectedTime, onSelect }) => {
  const franjas = groupSlotsByFranja(slots);
  return (
    <>
      {FRANJAS.map(({ key, label, icon }) =>
        franjas[key].length === 0 ? null : (
          <View key={key} style={styles.franjaBlock}>
            <View style={styles.franjaHeader}>
              <Ionicons name={icon} size={13} color="#64748B" />
              <Text style={styles.franjaLabel}>{label}</Text>
            </View>
            <View style={styles.slots}>
              {franjas[key].map((slot) => {
                const ocupado = slot.available === false;
                const active = selectedTime === slot.start_time;
                return (
                  <TouchableOpacity
                    key={slot.start_time}
                    disabled={ocupado}
                    style={[styles.slot, active && styles.slotActive, ocupado && styles.slotDisabled]}
                    onPress={() => onSelect(slot.start_time)}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive, ocupado && styles.slotTextDisabled]}>
                      {formatTime12h(slot.start_time)}
                    </Text>
                    <Text style={[styles.slotSubText, active && styles.slotSubTextActive, ocupado && styles.slotTextDisabled]}>
                      {ocupado ? "Ocupado" : `hasta ${formatTime12h(slot.end_time)}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )
      )}
    </>
  );
};

const SummaryRow = ({ icon, label, value }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIcon}><Ionicons name={icon} size={18} color="#5368D9" /></View>
    <View style={styles.summaryText}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  </View>
);

// Interruptor "Horario primero" / "Elegir doctor primero" dentro del paso 2.
const ModeToggle = ({ modo, onChange }) => (
  <View style={styles.modeToggle}>
    <TouchableOpacity style={[styles.modeOption, modo === "rapido" && styles.modeOptionActive]} onPress={() => onChange("rapido")}>
      <Text style={[styles.modeOptionText, modo === "rapido" && styles.modeOptionTextActive]}>Horario primero</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.modeOption, modo === "doctor" && styles.modeOptionActive]} onPress={() => onChange("doctor")}>
      <Text style={[styles.modeOptionText, modo === "doctor" && styles.modeOptionTextActive]}>Elegir doctor</Text>
    </TouchableOpacity>
  </View>
);

export default function NewAppointmentScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([GENERAL_SERVICE]);
  const [selectedId, setSelectedId] = useState(null);
  // "rapido" (por defecto, sin doctor) o "doctor" (elige doctor antes que fecha/hora)
  const [modo, setModo] = useState("rapido");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [description, setDescription] = useState("");
  const [metodoPago, setMetodoPago] = useState("reception");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const upcomingDays = useMemo(getUpcomingDays, []);
  const selectedService = services.find((service) => service._id === selectedId);
  const selectedSlot = slots.find((slot) => slot.start_time === selectedTime);

  // Paso "elegir doctor" (modo doctor primero): solo doctores con horario configurado.
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  // Días laborables y excepciones del doctor elegido, para bloquear en el selector de
  // fecha los días que no atiende. null mientras no aplica ningún bloqueo (modo rápido
  // o mientras todavía no llega la respuesta).
  const [workingDays, setWorkingDays] = useState(null);
  const [exceptions, setExceptions] = useState([]);

  const totalSteps = modo === "doctor" ? 4 : 3;

  useEffect(() => {
    apiClient("/appointments/patient/procedures")
      .then((response) => setServices([GENERAL_SERVICE, ...(response.data || [])]))
      .catch((error) => showError(error.message || "No se pudieron cargar los servicios."))
      .finally(() => setLoading(false));
  }, []);

  // Lista de doctores agendables al entrar en modo "doctor". Se guarda el paso actual en
  // un ref para que, si la respuesta llega tarde (después de que el paciente ya eligió
  // doctor y avanzó al paso de horarios), no aparezca un error de "no se pudieron cargar
  // los doctores" fuera de lugar: para entonces esa lista ya no importa.
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (modo !== "doctor") return;
    setDoctorsLoading(true);
    apiClient("/patient-portal/doctors-schedulable")
      .then((response) => setDoctors(response || []))
      .catch((error) => {
        setDoctors([]);
        if (stepRef.current === 2) showError(error.message || "No se pudieron cargar los doctores.");
      })
      .finally(() => setDoctorsLoading(false));
  }, [modo]);

  // Días laborables del doctor elegido, para bloquear el selector de fecha.
  useEffect(() => {
    if (!selectedDoctor) { setWorkingDays(null); setExceptions([]); return; }
    apiClient(`/patient-portal/schedule/${selectedDoctor._id}/working-days`)
      .then((response) => { setWorkingDays(response.workingDays || []); setExceptions(response.exceptions || []); })
      .catch(() => { setWorkingDays([]); setExceptions([]); });
  }, [selectedDoctor]);

  // Horarios: agregados entre todos los doctores (paso 2, modo rápido) o del doctor ya
  // elegido (paso 3, modo doctor). Ambos casos ocurren en el paso donde vive el
  // selector de fecha y hora de cada modo.
  useEffect(() => {
    const enPasoDeHorarioRapido = modo === "rapido" && step === 2;
    const enPasoDeHorarioDoctor = modo === "doctor" && step === 3;
    if (!enPasoDeHorarioRapido && !enPasoDeHorarioDoctor) return;
    if (!selectedId) return;
    if (enPasoDeHorarioDoctor && !selectedDoctor) return;

    setSlotsLoading(true);
    setSelectedTime("");
    // includeBooked: true trae también los horarios ya ocupados por otra cita de este
    // doctor (marcados con available:false), para pintarlos bloqueados en vez de que
    // simplemente desaparezcan de la lista sin explicación.
    const solicitud = enPasoDeHorarioDoctor
      ? apiClient(`/patient-portal/schedule/${selectedDoctor._id}/slots`, { params: { date, duration: selectedService?.estimated_duration || 30, includeBooked: true } })
      : apiClient("/schedule/patient-available-slots", { params: { date, procedure_id: selectedId } });

    solicitud
      .then((response) => setSlots(response.slots || []))
      .catch((error) => { setSlots([]); showError(error.message || "No se pudo consultar la disponibilidad."); })
      .finally(() => setSlotsLoading(false));
  }, [date, selectedId, step, modo, selectedDoctor]);

  // Un día cae dentro de una excepción bloqueante (vacaciones, día no laborable) si su
  // fecha está en el rango [date, end_date]. "special_hours" no bloquea el día, solo
  // cambia el horario dentro de él (ya lo resuelve el cálculo de slots del servidor).
  const fechaDentroDeExcepcionBloqueante = (key) => exceptions.some((ex) => {
    if (ex.type === "special_hours") return false;
    const desde = new Date(ex.date).toISOString().slice(0, 10);
    const hasta = ex.end_date ? new Date(ex.end_date).toISOString().slice(0, 10) : desde;
    return key >= desde && key <= hasta;
  });

  const diaDeshabilitado = (day, key) => {
    if (workingDays === null) return false;
    if (!workingDays.includes(day.getDay())) return true;
    return fechaDentroDeExcepcionBloqueante(key);
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setDate(toDateKey(new Date()));
    setSelectedTime("");
    setSlots([]);
    setSelectedDoctor(null);
  };

  const elegirDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setDate(toDateKey(new Date()));
    setSelectedTime("");
    setSlots([]);
  };

  const next = () => {
    if (step === 1 && !selectedService) return showError("Selecciona el tipo de consulta.");
    if (step === 2 && modo === "rapido" && !selectedSlot) return showError("Selecciona un horario disponible.");
    if (step === 2 && modo === "doctor" && !selectedDoctor) return showError("Selecciona un doctor.");
    if (step === 3 && modo === "doctor" && !selectedSlot) return showError("Selecciona un horario disponible.");
    setStep((current) => Math.min(current + 1, totalSteps));
  };

  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep((current) => current - 1);
  };

  const save = async () => {
    if (description.trim() && description.trim().length < 3) return showError("El motivo debe tener al menos 3 caracteres.");
    setSaving(true);
    try {
      const response = await apiClient("/patient-portal/appointments", {
        method: "POST",
        body: {
          // undefined en modo rápido: la cita queda sin asignar y la puede aceptar
          // cualquier doctor disponible.
          doctor_id: selectedDoctor?._id,
          procedure_id: selectedId === "general" ? undefined : selectedId,
          date,
          start_time: selectedSlot.start_time,
          description: description.trim() || undefined,
          payment_method: metodoPago,
        },
      });

      // Pagar en línea: la cita queda "pending" y se pasa a la pantalla de pago propia.
      if (response.requiresPayment) {
        navigation.navigate("PayAppointment", { appointmentId: response.appointment._id, tabSwitch: false });
        return;
      }

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
          <Text style={styles.successText}>
            {selectedDoctor
              ? "Tu solicitud quedó pendiente de que el doctor la acepte. Verás cualquier cambio en Consultas."
              : "Tu solicitud quedó pendiente. Cualquier doctor disponible podrá aceptarla y verás cualquier cambio en Consultas."}
          </Text>
          <View style={styles.summaryCard}>
            <SummaryRow icon="medkit-outline" label="Servicio" value={selectedService.name} />
            {selectedDoctor && <SummaryRow icon="person-outline" label="Doctor" value={`Dr. ${selectedDoctor.name} ${selectedDoctor.last_name}`} />}
            <SummaryRow icon="calendar-outline" label="Fecha" value={longDate(date)} />
            <SummaryRow icon="time-outline" label="Hora" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
            <SummaryRow icon="hourglass-outline" label="Estado" value="Pendiente de asignación" />
          </View>
          {/* tabSwitch: false explícito: sin esto, si el usuario llegó aquí después de tocar
              una pestaña del BottomNav, el tabSwitch: true de esa navegación anterior se
              mezclaría con estos params (React Navigation combina params al reusar una
              pantalla ya existente en el stack) y esta transición perdería su animación. */}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Appointments", { tabSwitch: false })}>
            <Ionicons name="calendar-outline" size={18} color="#2F6BFF" />
            <Text style={styles.secondaryButtonText}>Ver mis consultas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Dashboard", { tabSwitch: false })}>
            <Text style={styles.primaryButtonText}>Ir al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const filteredServices = services.filter((service) => service.name.toLowerCase().includes(search.trim().toLowerCase()));
  // El paso de confirmación (step === totalSteps) nunca depende de esta validación: para
  // llegar ahí ya se cumplieron todos los pasos anteriores, y su botón se controla aparte
  // con "saving" únicamente (ver el TouchableOpacity del footer).
  const puedeContinuar =
    step === totalSteps ||
    (step === 1 && !!selectedService) ||
    (step === 2 && modo === "rapido" && !!selectedSlot) ||
    (step === 2 && modo === "doctor" && !!selectedDoctor) ||
    (step === 3 && modo === "doctor" && !!selectedSlot);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerButton}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Agendar cita</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="close" size={23} color="#111827" /></TouchableOpacity>
      </View>
      <Stepper step={step} modo={modo} />

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
            <ModeToggle modo={modo} onChange={cambiarModo} />

            {modo === "rapido" ? (
              <>
                <Text style={styles.title}>Elige la fecha y hora</Text>
                <Text style={styles.subtitle}>Mostramos horarios donde hay al menos un doctor disponible</Text>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Selecciona fecha</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                    {upcomingDays.map((day) => {
                      const key = toDateKey(day); const active = key === date;
                      return <TouchableOpacity key={key} style={[styles.day, active && styles.dayActive]} onPress={() => setDate(key)}>
                        <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", "")}</Text>
                        <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
                      </TouchableOpacity>;
                    })}
                  </ScrollView>
                  <Text style={[styles.panelTitle, styles.timeTitle]}>Selecciona hora</Text>
                  {slotsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : slots.length ? (
                    <SlotPicker slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
                  ) : <View style={styles.noSlots}><Ionicons name="time-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha.</Text></View>}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Elige tu doctor</Text>
                <Text style={styles.subtitle}>Solo se muestran doctores con horario ya configurado</Text>
                {doctorsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : doctors.length === 0 ? (
                  <View style={styles.noSlots}><Ionicons name="alert-circle-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay doctores con horario configurado por el momento.</Text></View>
                ) : doctors.map((doctor) => (
                  <TouchableOpacity key={doctor._id} style={[styles.doctorCard, selectedDoctor?._id === doctor._id && styles.doctorCardSelected]} onPress={() => elegirDoctor(doctor)}>
                    <View style={styles.doctorAvatar}>
                      {doctor.img_url ? <Image source={{ uri: doctor.img_url }} style={styles.doctorAvatarImg} /> : <Ionicons name="person" size={20} color="#5368D9" />}
                    </View>
                    <Text style={styles.doctorName}>Dr. {doctor.name} {doctor.last_name}</Text>
                    <Ionicons name={selectedDoctor?._id === doctor._id ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedDoctor?._id === doctor._id ? "#2F6BFF" : "#111827"} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        ) : null}

        {step === 3 && modo === "doctor" ? (
          <>
            <Text style={styles.title}>Elige la fecha y hora</Text>
            <Text style={styles.subtitle}>Días y horarios disponibles de Dr. {selectedDoctor?.name} {selectedDoctor?.last_name}</Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Selecciona fecha</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {upcomingDays.map((day) => {
                  const key = toDateKey(day); const active = key === date; const disabled = diaDeshabilitado(day, key);
                  return <TouchableOpacity key={key} disabled={disabled} style={[styles.day, active && styles.dayActive, disabled && styles.dayDisabled]} onPress={() => setDate(key)}>
                    <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", "")}</Text>
                    <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
                  </TouchableOpacity>;
                })}
              </ScrollView>
              <Text style={[styles.panelTitle, styles.timeTitle]}>Selecciona hora</Text>
              {slotsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : slots.length ? (
                <SlotPicker slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
              ) : <View style={styles.noSlots}><Ionicons name="time-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha.</Text></View>}
            </View>
          </>
        ) : null}

        {step === totalSteps ? (
          <>
            <Text style={styles.title}>Confirma los detalles de tu cita</Text>
            <Text style={styles.subtitle}>Revisa que la información sea correcta</Text>
            <View style={styles.summaryCard}>
              <SummaryRow icon="medkit-outline" label="Servicio" value={selectedService.name} />
              {selectedDoctor && <SummaryRow icon="person-outline" label="Doctor" value={`Dr. ${selectedDoctor.name} ${selectedDoctor.last_name}`} />}
              <SummaryRow icon="calendar-outline" label="Fecha" value={longDate(date)} />
              <SummaryRow icon="time-outline" label="Hora" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
              <SummaryRow icon="cash-outline" label="Costo" value={money(selectedService.price)} />
              <SummaryRow icon="hourglass-outline" label="Estado inicial" value="Pendiente de asignación" />
            </View>

            <Text style={[styles.panelTitle, styles.timeTitle]}>Método de pago</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity key={method.key} style={[styles.paymentCard, metodoPago === method.key && styles.paymentCardSelected]} onPress={() => setMetodoPago(method.key)}>
                <View style={styles.paymentIcon}><Ionicons name={method.icon} size={18} color="#5368D9" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{method.title}</Text>
                  <Text style={styles.paymentDescription}>{method.description}</Text>
                </View>
                <Ionicons name={metodoPago === method.key ? "checkmark-circle" : "ellipse-outline"} size={20} color={metodoPago === method.key ? "#2F6BFF" : "#CBD5E1"} />
              </TouchableOpacity>
            ))}

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
        <TouchableOpacity disabled={saving} style={[styles.primaryButton, (!puedeContinuar || saving) && styles.buttonDisabled]} onPress={step === totalSteps ? save : next}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{step === totalSteps ? (metodoPago === "online" ? "Pagar anticipo" : "Confirmar cita") : "Continuar"}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
