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
import NotificationBell from "../../components/NotificationBell";

const SERVICE_ICONS = ["medkit-outline", "heart-outline", "fitness-outline", "bandage-outline", "flask-outline"];
const PAYMENT_METHODS = [
  { key: "reception", icon: "wallet-outline", title: "Pagar en recepción", description: "Paga el total en efectivo o con tarjeta el día de tu cita." },
  { key: "online", icon: "card-outline", title: "Pagar anticipo en línea", description: "Aparta tu hora pagando el 50% ahora (modo de prueba con Wompi). El resto se paga en recepción." },
];

// Etiquetas del stepper según el modo elegido dentro del paso 2: en modo "rapido" (por
// defecto, igual a como funcionaba antes esta pantalla) la cita queda sin asignar y
// cualquier doctor (o enfermera, ver requiresDoctorForService) disponible la puede
// aceptar. En modo "doctor" se elige proveedor antes que la fecha, así que se agrega
// un paso más y la fecha/hora queda filtrada a los días y horas reales de ese proveedor.
const stepLabelsByMode = (requiresDoctor) => ({
  rapido: ["Especialidad", "Fecha y hora", "Confirmación"],
  doctor: ["Especialidad", requiresDoctor ? "Doctor" : "Enfermera", "Fecha y hora", "Confirmación"],
});

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const longDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Igual que en la web (StepFechaHora.jsx): si el horario elegible ya pasó, no tiene
// sentido seguir mostrándolo entre los disponibles del día de hoy.
const isFutureSlot = (slot) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [h, m] = String(slot.start_time).split(":").map(Number);
  return h * 60 + m > nowMinutes;
};

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

const Stepper = ({ step, modo, requiresDoctor = true }) => {
  const labels = stepLabelsByMode(requiresDoctor)[modo] || stepLabelsByMode(requiresDoctor).rapido;
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

// Interruptor "Horario primero" / "Elegir doctor" (o "Elegir enfermera", ver
// requiresDoctorForService) dentro del paso 2.
const ModeToggle = ({ modo, onChange, requiresDoctor = true }) => (
  <View style={styles.modeToggle}>
    <TouchableOpacity style={[styles.modeOption, modo === "rapido" && styles.modeOptionActive]} onPress={() => onChange("rapido")}>
      <Text style={[styles.modeOptionText, modo === "rapido" && styles.modeOptionTextActive]}>Horario primero</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.modeOption, modo === "doctor" && styles.modeOptionActive]} onPress={() => onChange("doctor")}>
      <Text style={[styles.modeOptionText, modo === "doctor" && styles.modeOptionTextActive]}>{requiresDoctor ? "Elegir doctor" : "Elegir enfermera"}</Text>
    </TouchableOpacity>
  </View>
);

export default function NewAppointmentScreen({ navigation, route }) {
  // Modo reagendar: llega desde "Reagendar cita" (detalle de una cita "pendiente" o "por
  // reagendar"). Reusa el mismo registro (conserva el anticipo), no se puede cambiar el
  // servicio y al confirmar llama a PATCH /patient-portal/appointments/:id/reschedule.
  const reschedule = route?.params?.reschedule || null;
  const [rescheduleId] = useState(reschedule?.appointmentId || null);
  // Modo prellenado: llega desde "Reagendar cita" de una cita ya confirmada (scheduled),
  // que el backend no permite reagendar reusando el registro (ver RESCHEDULABLE_STATUSES).
  // AppointmentDetailScreen ya canceló esa cita antes de navegar aquí; esto solo precarga
  // el mismo servicio y proveedor para que el paciente no tenga que elegirlos de nuevo,
  // mismo criterio que irAAgendarConPrefill en el portal público. A diferencia de
  // "reschedule", es una cita nueva de cero (rescheduleId se queda en null).
  const prefill = route?.params?.prefill || null;

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  // Uno o más servicios (procedimientos) elegidos: la duración y el precio de la cita son
  // la suma de todos. reschedule/prefill traen procedureIds (array) — o, de un cliente
  // viejo, procedureId suelto — nunca ambas formas a la vez.
  const [selectedIds, setSelectedIds] = useState(
    reschedule?.procedureIds || prefill?.procedureIds ||
    (reschedule?.procedureId ? [reschedule.procedureId] : null) ||
    (prefill?.procedureId ? [prefill.procedureId] : null) ||
    []
  );
  // "rapido" (por defecto, sin doctor) o "doctor" (elige doctor antes que fecha/hora)
  const [modo, setModo] = useState("rapido");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [description, setDescription] = useState(prefill?.motivo || "");
  const [metodoPago, setMetodoPago] = useState("reception");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const upcomingDays = useMemo(getUpcomingDays, []);
  const selectedServices = services.filter((service) => selectedIds.includes(service._id));
  const serviceDuration = selectedServices.reduce((sum, s) => sum + (Number(s.estimated_duration) || 30), 0) || 30;
  const serviceTotal = selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  // Si el día elegido es hoy, oculta los horarios que ya pasaron (mismo criterio que
  // StepFechaHora.jsx en la web).
  const todayKey = toDateKey(new Date());
  const visibleSlots = date === todayKey ? slots.filter(isFutureSlot) : slots;
  const selectedSlot = visibleSlots.find((slot) => slot.start_time === selectedTime);
  // Un servicio con requires_doctor === false lo atiende una enfermera como proveedora
  // principal en el modo "doctor". Mezclar uno que requiere doctor con uno que no, el
  // doctor pasa a ser el proveedor principal. Sin ningún servicio elegido todavía, por
  // defecto se asume que sí requiere doctor.
  const requiresDoctorForService = selectedServices.length === 0 || selectedServices.some((s) => s.requires_doctor !== false);

  // Paso "elegir doctor" (modo doctor primero): solo doctores con horario configurado.
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  // Mismo rol que doctors/selectedDoctor, pero para cuando el servicio no requiere
  // doctor (ver requiresDoctorForService): ahí la enfermera es la proveedora principal.
  // Nunca selectedDoctor y selectedNurse quedan elegidos a la vez.
  const [nurses, setNurses] = useState([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  // Días laborables y excepciones del proveedor elegido, para bloquear en el selector de
  // fecha los días que no atiende. null mientras no aplica ningún bloqueo (modo rápido
  // o mientras todavía no llega la respuesta).
  const [workingDays, setWorkingDays] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  // true mientras no se sabe todavía (no bloquea de más antes de tener la respuesta): si
  // hoy ya no le queda ningún horario disponible (todos ya pasaron, o el día está
  // completo), el botón de hoy debe verse deshabilitado en el selector de fecha. Se
  // resuelve con un fetch propio de hoy, independiente del día actualmente elegido
  // (date), porque hace falta saberlo incluso si el paciente ya navegó a otro día.
  const [todayHasSlots, setTodayHasSlots] = useState(true);

  const totalSteps = modo === "doctor" ? 4 : 3;

  useEffect(() => {
    apiClient("/appointments/patient/procedures")
      .then((response) => {
        setServices(response.data || []);
        // Modo reagendar (reschedule): el paciente rehace el flujo completo desde el
        // paso 1 (puede cambiar de servicio), así que NO se salta — solo llega con
        // selectedIds pre-marcado como punto de partida. Modo prellenado (prefill, cita
        // "scheduled" cancelada+recreada) sigue saltando directo al paso de fecha y hora
        // como antes, ya que ese camino queda fuera de este cambio.
        if (!reschedule && selectedIds.length > 0 && !prefill?.doctorId && !prefill?.nurseId) setStep(2);
      })
      .catch((error) => showError(error.message || "No se pudieron cargar los servicios."))
      .finally(() => setLoading(false));
  }, []);

  // Restaura el proveedor de la cita cancelada (ver prefill arriba). Corre una sola vez al
  // montar, independiente de que ya haya cargado el catálogo de servicios.
  useEffect(() => {
    if (prefill?.doctorId) {
      setModo("doctor");
      apiClient("/patient-portal/doctors-schedulable")
        .then((list) => {
          const encontrado = (list || []).find((d) => d._id === prefill.doctorId);
          if (encontrado) { setSelectedDoctor(encontrado); setStep(3); }
          else { setModo("rapido"); setStep(2); }
        })
        .catch(() => { setModo("rapido"); setStep(2); });
    } else if (prefill?.nurseId) {
      setModo("doctor");
      apiClient("/patient-portal/nurses-schedulable")
        .then((list) => {
          const encontrada = (list || []).find((n) => n._id === prefill.nurseId);
          if (encontrada) { setSelectedNurse(encontrada); setStep(3); }
          else { setModo("rapido"); setStep(2); }
        })
        .catch(() => { setModo("rapido"); setStep(2); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista de doctores (o enfermeras, ver requiresDoctorForService) agendables al entrar
  // en modo "doctor". Se guarda el paso actual en un ref para que, si la respuesta
  // llega tarde (después de que el paciente ya eligió proveedor y avanzó al paso de
  // horarios), no aparezca un error de "no se pudieron cargar los doctores" fuera de
  // lugar: para entonces esa lista ya no importa.
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (modo !== "doctor") return;
    if (requiresDoctorForService) {
      setDoctorsLoading(true);
      apiClient("/patient-portal/doctors-schedulable")
        .then((response) => setDoctors(response || []))
        .catch((error) => {
          setDoctors([]);
          if (stepRef.current === 2) showError(error.message || "No se pudieron cargar los doctores.");
        })
        .finally(() => setDoctorsLoading(false));
    } else {
      setNursesLoading(true);
      apiClient("/patient-portal/nurses-schedulable")
        .then((response) => setNurses(response || []))
        .catch((error) => {
          setNurses([]);
          if (stepRef.current === 2) showError(error.message || "No se pudieron cargar las enfermeras.");
        })
        .finally(() => setNursesLoading(false));
    }
  }, [modo, requiresDoctorForService]);

  // Días laborables del proveedor elegido, para bloquear el selector de fecha.
  useEffect(() => {
    const provider = selectedDoctor || selectedNurse;
    if (!provider) { setWorkingDays(null); setExceptions([]); return; }
    const url = selectedDoctor
      ? `/patient-portal/schedule/${selectedDoctor._id}/working-days`
      : `/patient-portal/nurse-schedule/${selectedNurse._id}/working-days`;
    apiClient(url)
      .then((response) => { setWorkingDays(response.workingDays || []); setExceptions(response.exceptions || []); })
      .catch(() => { setWorkingDays([]); setExceptions([]); });
  }, [selectedDoctor, selectedNurse]);

  // Horarios: agregados entre todos los doctores/enfermeras (paso 2, modo rápido) o del
  // proveedor ya elegido (paso 3, modo doctor). Ambos casos ocurren en el paso donde
  // vive el selector de fecha y hora de cada modo.
  useEffect(() => {
    const enPasoDeHorarioRapido = modo === "rapido" && step === 2;
    const enPasoDeHorarioProveedor = modo === "doctor" && step === 3;
    if (!enPasoDeHorarioRapido && !enPasoDeHorarioProveedor) return;
    if (selectedIds.length === 0) return;
    const provider = selectedDoctor || selectedNurse;
    if (enPasoDeHorarioProveedor && !provider) return;

    setSlotsLoading(true);
    setSelectedTime("");
    // Sin abortar la petición anterior, cambiar de fecha o de proveedor varias veces
    // seguidas podía dejar que una respuesta tardía de una selección ya abandonada
    // sobrescribiera "slots" con horarios de un día distinto al que se ve en pantalla.
    const controller = new AbortController();
    // includeBooked: true trae también los horarios ya ocupados por otra cita de este
    // proveedor (marcados con available:false), para pintarlos bloqueados en vez de que
    // simplemente desaparezcan de la lista sin explicación.
    const solicitud = enPasoDeHorarioProveedor
      ? apiClient(
          selectedDoctor
            ? `/patient-portal/schedule/${selectedDoctor._id}/slots`
            : `/patient-portal/nurse-schedule/${selectedNurse._id}/slots`,
          { params: { date, duration: serviceDuration, includeBooked: true }, signal: controller.signal }
        )
      : apiClient("/schedule/patient-available-slots", { params: { date, procedure_id: selectedIds.join(",") }, signal: controller.signal });

    solicitud
      .then((response) => setSlots(response.slots || []))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setSlots([]);
        showError(error.message || "No se pudo consultar la disponibilidad.");
      })
      .finally(() => { if (!controller.signal.aborted) setSlotsLoading(false); });
    return () => controller.abort();
  }, [date, selectedIds.join(","), step, modo, selectedDoctor, selectedNurse]);

  // Consulta los horarios de HOY (sin importar cuál día esté seleccionado) solo para
  // saber si ya no le queda ninguno disponible, y así poder deshabilitar su botón en el
  // selector de fecha. Mismo criterio que el efecto de arriba, pero fijo a hoy.
  useEffect(() => {
    const enPasoDeHorarioRapido = modo === "rapido" && step === 2;
    const enPasoDeHorarioProveedor = modo === "doctor" && step === 3;
    if (!enPasoDeHorarioRapido && !enPasoDeHorarioProveedor) return;
    if (selectedIds.length === 0) return;
    const provider = selectedDoctor || selectedNurse;
    if (enPasoDeHorarioProveedor && !provider) return;

    setTodayHasSlots(true);
    // Mismo criterio que el efecto de arriba: se aborta la petición anterior para que una
    // respuesta tardía no sobrescriba todayHasSlots con un resultado que ya no corresponde
    // a la selección actual.
    const controller = new AbortController();
    const solicitud = enPasoDeHorarioProveedor
      ? apiClient(
          selectedDoctor
            ? `/patient-portal/schedule/${selectedDoctor._id}/slots`
            : `/patient-portal/nurse-schedule/${selectedNurse._id}/slots`,
          { params: { date: todayKey, duration: serviceDuration, includeBooked: true }, signal: controller.signal }
        )
      : apiClient("/schedule/patient-available-slots", { params: { date: todayKey, procedure_id: selectedIds.join(",") }, signal: controller.signal });

    solicitud
      .then((response) => setTodayHasSlots((response.slots || []).some(isFutureSlot)))
      .catch((error) => { if (error.name !== "AbortError") setTodayHasSlots(true); });
    return () => controller.abort();
  }, [selectedIds.join(","), step, modo, selectedDoctor, selectedNurse]);

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
    if (key === todayKey && !todayHasSlots) return true;
    if (workingDays === null) return false;
    if (!workingDays.includes(day.getDay())) return true;
    return fechaDentroDeExcepcionBloqueante(key);
  };

  // Agregar o quitar un servicio de la selección invalida el proveedor y el horario ya
  // elegidos: si cambia si el conjunto requiere doctor o enfermera
  // (requiresDoctorForService), un proveedor de la selección anterior podía quedar
  // "pegado" y mostrarse junto al nuevo en la confirmación y en la pantalla de éxito
  // (mismo criterio que elegirTipo en el portal público).
  const elegirServicio = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]));
    setSelectedDoctor(null);
    setSelectedNurse(null);
    setDate(toDateKey(new Date()));
    setSelectedTime("");
    setSlots([]);
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setDate(toDateKey(new Date()));
    setSelectedTime("");
    setSlots([]);
    setSelectedDoctor(null);
    setSelectedNurse(null);
  };

  // Elige el proveedor principal del modo "doctor": el doctor normalmente, o la
  // enfermera cuando el servicio no requiere doctor (ver requiresDoctorForService).
  const elegirProveedor = (provider) => {
    if (requiresDoctorForService) setSelectedDoctor(provider); else setSelectedNurse(provider);
    setDate(toDateKey(new Date()));
    setSelectedTime("");
    setSlots([]);
  };

  const next = () => {
    if (step === 1 && selectedServices.length === 0) return showError("Selecciona al menos un tipo de consulta.");
    if (step === 2 && modo === "rapido" && !selectedSlot) return showError("Selecciona un horario disponible.");
    if (step === 2 && modo === "doctor" && requiresDoctorForService && !selectedDoctor) return showError("Selecciona un doctor.");
    if (step === 2 && modo === "doctor" && !requiresDoctorForService && !selectedNurse) return showError("Selecciona una enfermera.");
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
      if (rescheduleId) {
        const response = await apiClient(`/patient-portal/appointments/${rescheduleId}/reschedule`, {
          method: "PATCH",
          body: {
            date,
            start_time: selectedSlot.start_time,
            procedure_ids: selectedIds,
            doctor_id: requiresDoctorForService ? selectedDoctor?._id : undefined,
            nurse_id: requiresDoctorForService ? undefined : selectedNurse?._id,
          },
        });
        void response;
        setSuccess(true);
        return;
      }

      const response = await apiClient("/patient-portal/appointments", {
        method: "POST",
        body: {
          // undefined en modo rápido (o sin proveedor puntual elegido): la cita queda
          // sin asignar y la puede aceptar cualquier doctor (o enfermera, si el
          // servicio no requiere doctor) disponible. Nunca se envían doctor_id y
          // nurse_id a la vez.
          doctor_id: requiresDoctorForService ? selectedDoctor?._id : undefined,
          nurse_id: requiresDoctorForService ? undefined : selectedNurse?._id,
          procedure_ids: selectedIds,
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
          <Text style={styles.successTitle}>{rescheduleId ? "¡Cita reagendada!" : "¡Cita solicitada con éxito!"}</Text>
          <Text style={styles.successText}>
            {rescheduleId
              ? "Tu cita quedó de nuevo pendiente. Un profesional debe aceptarla y verás cualquier cambio en Consultas."
              : selectedDoctor
              ? "Tu solicitud quedó pendiente de que el doctor la acepte. Verás cualquier cambio en Consultas."
              : selectedNurse
                ? "Tu solicitud quedó pendiente de que la enfermera la acepte. Verás cualquier cambio en Consultas."
                : requiresDoctorForService
                  ? "Tu solicitud quedó pendiente. Cualquier doctor disponible podrá aceptarla y verás cualquier cambio en Consultas."
                  : "Tu solicitud quedó pendiente. Cualquier enfermera disponible podrá aceptarla y verás cualquier cambio en Consultas."}
          </Text>
          <View style={styles.summaryCard}>
            <SummaryRow icon="medkit-outline" label="Servicio" value={selectedServices.map((s) => s.name).join(", ") || "Consulta"} />
            {selectedDoctor && <SummaryRow icon="person-outline" label="Doctor" value={`Dr. ${selectedDoctor.name} ${selectedDoctor.last_name}`} />}
            {selectedNurse && <SummaryRow icon="person-outline" label="Enfermera" value={`${selectedNurse.name} ${selectedNurse.last_name}`} />}
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
    (step === 1 && selectedServices.length > 0) ||
    (step === 2 && modo === "rapido" && !!selectedSlot) ||
    (step === 2 && modo === "doctor" && (requiresDoctorForService ? !!selectedDoctor : !!selectedNurse)) ||
    (step === 3 && modo === "doctor" && !!selectedSlot);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerButton}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{rescheduleId ? "Reagendar cita" : "Agendar cita"}</Text>
        {/* Antes había una "X" que hacía exactamente lo mismo que la flecha de volver
            (navigation.goBack() redundante) — se reemplaza por la campana de
            notificaciones, igual que el resto de las pantallas. */}
        <NotificationBell navigation={navigation} color="#111827" />
      </View>
      <Stepper step={step} modo={modo} requiresDoctor={requiresDoctorForService} />

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
              <TouchableOpacity key={service._id} style={[styles.serviceCard, selectedIds.includes(service._id) && styles.serviceCardSelected]} onPress={() => elegirServicio(service._id)}>
                <View style={styles.serviceIcon}><Ionicons name={SERVICE_ICONS[index % SERVICE_ICONS.length]} size={21} color="#5368D9" /></View>
                <View style={styles.serviceText}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceMeta}>{service.estimated_duration || 30} min · {money(service.price)}</Text>
                </View>
                <Ionicons name={selectedIds.includes(service._id) ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedIds.includes(service._id) ? "#2F6BFF" : "#111827"} />
              </TouchableOpacity>
            ))}

            {selectedServices.length > 0 && (
              <View style={[styles.summaryCard, { marginTop: 4 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.summaryLabel}>
                      {selectedServices.length === 1 ? "1 servicio seleccionado" : `${selectedServices.length} servicios seleccionados`}
                    </Text>
                    <Text style={[styles.summaryValue, { textTransform: "none" }]} numberOfLines={2}>
                      {selectedServices.map((s) => s.name).join(", ")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.summaryValue, { color: "#2F6BFF" }]}>{money(serviceTotal)}</Text>
                    <Text style={styles.summaryLabel}>{serviceDuration} min</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <ModeToggle modo={modo} onChange={cambiarModo} requiresDoctor={requiresDoctorForService} />

            {modo === "rapido" ? (
              <>
                <Text style={styles.title}>Elige la fecha y hora</Text>
                <Text style={styles.subtitle}>Mostramos horarios donde hay al menos un profesional disponible</Text>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Selecciona fecha</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                    {upcomingDays.map((day) => {
                      const key = toDateKey(day); const active = key === date; const disabled = diaDeshabilitado(day, key);
                      return <TouchableOpacity key={key} disabled={disabled} style={[styles.day, active && styles.dayActive, disabled && styles.dayDisabled]} onPress={() => setDate(key)}>
                        <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString("es-SV", { weekday: "short" }).replace(".", "")}</Text>
                        <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
                      </TouchableOpacity>;
                    })}
                  </ScrollView>
                  <Text style={[styles.panelTitle, styles.timeTitle]}>Selecciona hora</Text>
                  {slotsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : visibleSlots.length ? (
                    <SlotPicker slots={visibleSlots} selectedTime={selectedTime} onSelect={setSelectedTime} />
                  ) : <View style={styles.noSlots}><Ionicons name="time-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha.</Text></View>}
                </View>
              </>
            ) : requiresDoctorForService ? (
              <>
                <Text style={styles.title}>Elige tu doctor</Text>
                <Text style={styles.subtitle}>Solo se muestran doctores con horario ya configurado</Text>
                {doctorsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : doctors.length === 0 ? (
                  <View style={styles.noSlots}><Ionicons name="alert-circle-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay doctores con horario configurado por el momento.</Text></View>
                ) : doctors.map((doctor) => (
                  <TouchableOpacity key={doctor._id} style={[styles.doctorCard, selectedDoctor?._id === doctor._id && styles.doctorCardSelected]} onPress={() => elegirProveedor(doctor)}>
                    <View style={styles.doctorAvatar}>
                      {doctor.img_url ? <Image source={{ uri: doctor.img_url }} style={styles.doctorAvatarImg} /> : <Ionicons name="person" size={20} color="#5368D9" />}
                    </View>
                    <Text style={styles.doctorName}>Dr. {doctor.name} {doctor.last_name}</Text>
                    <Ionicons name={selectedDoctor?._id === doctor._id ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedDoctor?._id === doctor._id ? "#2F6BFF" : "#111827"} />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.title}>Elige tu enfermera</Text>
                <Text style={styles.subtitle}>Solo se muestran enfermeras con horario ya configurado</Text>
                {nursesLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : nurses.length === 0 ? (
                  <View style={styles.noSlots}><Ionicons name="alert-circle-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay enfermeras con horario configurado por el momento.</Text></View>
                ) : nurses.map((nurse) => (
                  <TouchableOpacity key={nurse._id} style={[styles.doctorCard, selectedNurse?._id === nurse._id && styles.doctorCardSelected]} onPress={() => elegirProveedor(nurse)}>
                    <View style={styles.doctorAvatar}>
                      {nurse.img_url ? <Image source={{ uri: nurse.img_url }} style={styles.doctorAvatarImg} /> : <Ionicons name="person" size={20} color="#5368D9" />}
                    </View>
                    <Text style={styles.doctorName}>{nurse.name} {nurse.last_name}</Text>
                    <Ionicons name={selectedNurse?._id === nurse._id ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedNurse?._id === nurse._id ? "#2F6BFF" : "#111827"} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        ) : null}

        {step === 3 && modo === "doctor" ? (
          <>
            <Text style={styles.title}>Elige la fecha y hora</Text>
            <Text style={styles.subtitle}>
              {selectedDoctor
                ? `Días y horarios disponibles de Dr. ${selectedDoctor.name} ${selectedDoctor.last_name}`
                : `Días y horarios disponibles de ${selectedNurse?.name} ${selectedNurse?.last_name}`}
            </Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Selecciona fecha</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {upcomingDays.map((day) => {
                  const key = toDateKey(day); const active = key === date; const disabled = diaDeshabilitado(day, key);
                  return <TouchableOpacity key={key} disabled={disabled} style={[styles.day, active && styles.dayActive, disabled && styles.dayDisabled]} onPress={() => setDate(key)}>
                    <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString("es-SV", { weekday: "short" }).replace(".", "")}</Text>
                    <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
                  </TouchableOpacity>;
                })}
              </ScrollView>
              <Text style={[styles.panelTitle, styles.timeTitle]}>Selecciona hora</Text>
              {slotsLoading ? <ActivityIndicator color="#2F6BFF" style={styles.loader} /> : visibleSlots.length ? (
                <SlotPicker slots={visibleSlots} selectedTime={selectedTime} onSelect={setSelectedTime} />
              ) : <View style={styles.noSlots}><Ionicons name="time-outline" size={24} color="#B7791F" /><Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha.</Text></View>}
            </View>
          </>
        ) : null}

        {step === totalSteps ? (
          <>
            <Text style={styles.title}>{rescheduleId ? "Confirma el nuevo horario" : "Confirma los detalles de tu cita"}</Text>
            <Text style={styles.subtitle}>
              {rescheduleId ? "Un profesional debe aceptar la cita para confirmarla" : "Revisa que la información sea correcta"}
            </Text>
            <View style={styles.summaryCard}>
              <SummaryRow icon="medkit-outline" label="Servicio" value={selectedServices.map((s) => s.name).join(", ") || "Consulta"} />
              {selectedDoctor && <SummaryRow icon="person-outline" label="Doctor" value={`Dr. ${selectedDoctor.name} ${selectedDoctor.last_name}`} />}
              {selectedNurse && <SummaryRow icon="person-outline" label="Enfermera" value={`${selectedNurse.name} ${selectedNurse.last_name}`} />}
              <SummaryRow icon="calendar-outline" label="Fecha" value={longDate(date)} />
              <SummaryRow icon="time-outline" label="Hora" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
              <SummaryRow icon="cash-outline" label="Costo" value={money(serviceTotal)} />
              <SummaryRow icon="hourglass-outline" label="Estado inicial" value="Pendiente de asignación" />
            </View>

            {rescheduleId ? (
              <Text style={styles.rescheduleNote}>
                Si ya pagaste un anticipo para esta cita, se mantiene: al reagendar no se
                genera un nuevo cobro.
              </Text>
            ) : null}

            {!rescheduleId ? <Text style={[styles.panelTitle, styles.timeTitle]}>Método de pago</Text> : null}
            {!rescheduleId && PAYMENT_METHODS.map((method) => (
              <TouchableOpacity key={method.key} style={[styles.paymentCard, metodoPago === method.key && styles.paymentCardSelected]} onPress={() => setMetodoPago(method.key)}>
                <View style={styles.paymentIcon}><Ionicons name={method.icon} size={18} color="#5368D9" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{method.title}</Text>
                  <Text style={styles.paymentDescription}>{method.description}</Text>
                </View>
                <Ionicons name={metodoPago === method.key ? "checkmark-circle" : "ellipse-outline"} size={20} color={metodoPago === method.key ? "#2F6BFF" : "#CBD5E1"} />
              </TouchableOpacity>
            ))}

            {!rescheduleId ? (
              <>
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
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity disabled={saving} style={[styles.primaryButton, (!puedeContinuar || saving) && styles.buttonDisabled]} onPress={step === totalSteps ? save : next}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{step === totalSteps ? (rescheduleId ? "Reagendar cita" : metodoPago === "online" ? "Pagar anticipo" : "Confirmar cita") : "Continuar"}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
