import { useEffect, useState } from "react";
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

import apiClient from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { showError } from "../../lib/toast";
import {
  formatCardNumber, formatExpiry, formatCvv, detectarMarca, luhnValido, longitudValida,
  expiryValida, cvvValido, nombreValido, maskNombre,
} from "../../lib/paymentValidators";
import { formatTime12h } from "../../utils/date";
import { asProcedureArray } from "../../utils/procedures";
import styles from "../../styles/appointments/payAppointmentStyle";

const longDate = (iso) => new Date(iso).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const money = (value) => `$${Number(value || 0).toFixed(2)}`;

// El backend (Render, plan gratuito) se apaga solo tras un rato de inactividad: la
// primera petición después de eso puede tardar mucho en "despertarlo", antes incluso de
// llegar a Wompi (ver el mismo comentario en AuthContext.jsx sobre el WebSocket). Los 15s
// por defecto de apiClient no alcanzan para este flujo de pago en frío, y como son 3
// peticiones encadenadas (token -> tokenizar -> cobrar), cualquiera de las tres puede
// pisar ese arranque — con el default, el pago fallaba siempre con "El servidor no
// respondió" en vez de solo la primera vez que tarda en despertar.
const WOMPI_TIMEOUT_MS = 45000;

// Reintenta confirmar el pago varias veces antes de rendirse: confirm-payment nunca
// vuelve a cobrar la tarjeta (solo le pregunta a Wompi si esa transacción ya quedó
// aprobada), así que reintentarlo es seguro y ayuda a que un hipo de red no se
// confunda con un pago fallido. Misma lógica que la versión web (PayAppointment.jsx).
const CONFIRM_REINTENTOS = 3;
const CONFIRM_ESPERA_MS = 2000;

const confirmarConReintentos = async (idCita, idTransaccion) => {
  let ultimoError;
  for (let intento = 1; intento <= CONFIRM_REINTENTOS; intento++) {
    try {
      return await apiClient(`/patient-portal/appointments/${idCita}/confirm-payment`, {
        method: "POST",
        timeout: WOMPI_TIMEOUT_MS,
        body: { transactionId: idTransaccion },
      });
    } catch (err) {
      ultimoError = err;
      if (intento < CONFIRM_REINTENTOS) {
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_ESPERA_MS));
      }
    }
  }
  throw ultimoError;
};

// Pantalla de pago propia, misma arquitectura que la web (PayAppointment.jsx): el
// formulario de tarjeta vive aquí mismo, sin WebView ni checkout externo. La tarjeta
// viaja una sola vez hacia Wompi (vía el proxy /api/wompi/* del backend) para
// tokenizarla y cobrar; nunca se guarda en el sistema. El backend vuelve a confirmar
// el resultado con sus propias credenciales antes de dar la cita por agendada.
export default function PayAppointmentScreen({ route, navigation }) {
  const { appointmentId } = route.params || {};
  const { user } = useAuth();

  const [cita, setCita] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [aprobada, setAprobada] = useState(false);
  const [pagoSinConfirmar, setPagoSinConfirmar] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    nombreCliente: user ? `${user.name || ""} ${user.last_name || ""}`.trim() : "",
    emailCliente: user?.email || "",
    numeroTarjeta: "",
    vencimiento: "",
    cvv: "",
  });

  useEffect(() => {
    if (!appointmentId) { setCargando(false); return; }
    apiClient("/patient-portal/appointments")
      .then((lista) => setCita((lista || []).find((a) => a._id === appointmentId) || null))
      .catch(() => showError("No se pudo cargar la información de la cita."))
      .finally(() => setCargando(false));
  }, [appointmentId]);

  const marca = detectarMarca(form.numeroTarjeta);

  const setCampo = (campo) => (value) => {
    setForm((f) => ({ ...f, [campo]: value }));
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: "" }));
  };
  const setCampoConMascara = (campo, formateador) => (value) => {
    setForm((f) => ({ ...f, [campo]: formateador(value) }));
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: "" }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombreCliente.trim()) e.nombreCliente = "Requerido";
    else if (!nombreValido(form.nombreCliente)) e.nombreCliente = "Ingresa tu nombre y apellido, solo letras";

    if (!form.emailCliente.trim()) e.emailCliente = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailCliente)) e.emailCliente = "Correo inválido";

    const numeroLimpio = form.numeroTarjeta.replace(/\s/g, "");
    if (!numeroLimpio) e.numeroTarjeta = "Requerido";
    else if (!longitudValida(numeroLimpio)) e.numeroTarjeta = "El número de tarjeta está incompleto";
    else if (!luhnValido(numeroLimpio)) e.numeroTarjeta = "Número de tarjeta inválido";

    if (!form.vencimiento) e.vencimiento = "Requerido";
    else if (!expiryValida(form.vencimiento)) e.vencimiento = "Vencimiento inválido o vencido";

    if (!form.cvv) e.cvv = "Requerido";
    else if (!cvvValido(form.cvv, numeroLimpio)) e.cvv = marca === "Amex" ? "El CVV debe tener 4 dígitos" : "El CVV debe tener 3 dígitos";

    return e;
  };

  const handlePagar = async () => {
    if (!cita) return;
    const erroresValidacion = validar();
    setErrors(erroresValidacion);
    if (Object.keys(erroresValidacion).length > 0) return;

    const [mes, anio] = form.vencimiento.split("/");

    setPagando(true);
    let idTransaccionCobrada = null;
    try {
      const { access_token } = await apiClient("/wompi/token", { method: "POST", timeout: WOMPI_TIMEOUT_MS });

      const tokenTarjeta = await apiClient("/wompi/tokenizar", {
        method: "POST",
        timeout: WOMPI_TIMEOUT_MS,
        body: {
          token: access_token,
          formData: {
            numeroTarjeta: form.numeroTarjeta.replace(/\s+/g, ""),
            cvv: form.cvv,
            mesVencimiento: Number(mes),
            anioVencimiento: 2000 + Number(anio),
          },
        },
      });

      const resultado = await apiClient("/wompi/paymentTest", {
        method: "POST",
        timeout: WOMPI_TIMEOUT_MS,
        body: {
          token: access_token,
          formData: {
            monto: cita.deposit_amount,
            emailCliente: form.emailCliente,
            nombreCliente: form.nombreCliente,
            tokenTarjeta: tokenTarjeta.token,
            configuracion: { notificarTransaccionCliente: true },
            datosAdicionales: { appointment_id: appointmentId },
          },
        },
      });

      if (resultado.esAprobada !== true) {
        showError(resultado.mensaje || "El banco rechazó el pago.");
        return;
      }

      // A partir de aquí la tarjeta YA fue cobrada por Wompi: si algo sigue fallando,
      // nunca hay que sugerir volver a pagar (evita un cobro duplicado)
      idTransaccionCobrada = resultado.idTransaccion;

      const confirmacion = await confirmarConReintentos(appointmentId, idTransaccionCobrada);
      setCita(confirmacion.appointment);
      setAprobada(true);
    } catch (err) {
      if (idTransaccionCobrada) {
        setPagoSinConfirmar(idTransaccionCobrada);
      } else {
        showError(err.message || "No se pudo procesar el pago.");
      }
    } finally {
      setPagando(false);
    }
  };

  const reintentarConfirmacion = async (idTransaccion) => {
    setPagando(true);
    try {
      const confirmacion = await confirmarConReintentos(appointmentId, idTransaccion);
      if (confirmacion.appointment?.deposit_paid) {
        setCita(confirmacion.appointment);
        setPagoSinConfirmar(null);
        setAprobada(true);
      } else {
        setCita(confirmacion.appointment);
        showError("Ese pago todavía no aparece aprobado. Intenta de nuevo en un momento.");
      }
    } catch (err) {
      showError(err.message || "Seguimos sin poder confirmarlo. Intenta de nuevo en un momento.");
    } finally {
      setPagando(false);
    }
  };

  if (cargando) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#2F6BFF" size="large" /></View></SafeAreaView>;
  }

  // El banco ya aprobó el cobro pero no pudimos confirmarlo con el servidor tras
  // varios intentos: se avisa claramente para que el paciente NO vuelva a pagar.
  if (pagoSinConfirmar) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Ionicons name="alert-circle" size={56} color="#D97706" />
            <Text style={styles.successTitle}>Tu pago fue aprobado</Text>
            <Text style={styles.successText}>El banco aprobó el cobro, pero no pudimos confirmarlo con tu cita todavía.</Text>
            <Text style={[styles.successText, { color: "#DC2626", fontWeight: "700" }]}>No vuelvas a pagar.</Text>
            <Text style={styles.successText}>Guarda este número de referencia y vuelve a intentar confirmar en unos minutos:</Text>
            <Text style={styles.referenceBox}>{pagoSinConfirmar}</Text>
          </View>
          <TouchableOpacity disabled={pagando} style={[styles.primaryButton, pagando && styles.buttonDisabled]} onPress={() => reintentarConfirmacion(pagoSinConfirmar)}>
            {pagando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Verificar de nuevo</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Appointments", { tabSwitch: false })}>
            <Text style={styles.secondaryButtonText}>Ver mis citas</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (aprobada && cita) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ alignItems: "center", marginTop: 30 }}>
            <View style={styles.successCircle}><Ionicons name="checkmark" size={45} color="#FFF" /></View>
            <Text style={styles.successTitle}>¡Pago aprobado!</Text>
            <Text style={styles.successText}>Tu anticipo quedó registrado. Tu cita queda pendiente de que el doctor la acepte.</Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Appointments", { tabSwitch: false })}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Ver mis citas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Dashboard", { tabSwitch: false })}>
            <Text style={styles.secondaryButtonText}>Ir al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="arrow-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Pagar cita</Text>
        <View style={styles.headerButton} />
      </View>

      {!cita ? (
        <Text style={styles.emptyText}>No se encontró la cita.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={styles.summaryIcon}><Ionicons name="medkit-outline" size={20} color="#FB7185" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Detalle de la cita</Text>
                <Text style={styles.summaryDoctor} numberOfLines={1}>
                  {cita.doctor_id ? `Dr. ${cita.doctor_id.name} ${cita.doctor_id.last_name}` : "Por asignar"}
                </Text>
                <Text style={styles.summaryType} numberOfLines={1}>{asProcedureArray(cita.procedure_id).map((p) => p.name).join(", ") || cita.type}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.summaryAmount}>{money(cita.deposit_amount)}</Text>
              <Text style={styles.summaryAmountNote}>Anticipo (de {money(cita.total)})</Text>
            </View>
          </View>

          <Text style={styles.summaryType}>{longDate(cita.date)} · {formatTime12h(cita.start_time)}</Text>

          {cita.wompi_transaction_id && (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={18} color="#D97706" />
              <Text style={styles.warningText}>Ya existe un intento de pago para esta cita. Verifica si ya fue aprobado antes de pagar de nuevo.</Text>
              <TouchableOpacity disabled={pagando} style={styles.warningButton} onPress={() => reintentarConfirmacion(cita.wompi_transaction_id)}>
                <Text style={styles.warningButtonText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="card-outline" size={18} color="#2F6BFF" />
              <Text style={styles.panelHeaderText}>Datos de la tarjeta</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <View style={[styles.inputBox, errors.nombreCliente && styles.inputBoxError]}>
                <Ionicons name="person-outline" size={16} color="#94A3B8" />
                <TextInput style={styles.input} value={form.nombreCliente} onChangeText={setCampoConMascara("nombreCliente", maskNombre)} placeholder="Como aparece en la tarjeta" placeholderTextColor="#94A3B8" />
              </View>
              {errors.nombreCliente ? <Text style={styles.errorText}>{errors.nombreCliente}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <View style={[styles.inputBox, errors.emailCliente && styles.inputBoxError]}>
                <Ionicons name="mail-outline" size={16} color="#94A3B8" />
                <TextInput style={styles.input} value={form.emailCliente} onChangeText={setCampo("emailCliente")} placeholder="tucorreo@ejemplo.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />
              </View>
              {errors.emailCliente ? <Text style={styles.errorText}>{errors.emailCliente}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Número de tarjeta</Text>
              <View style={[styles.inputBox, errors.numeroTarjeta && styles.inputBoxError]}>
                <Ionicons name="card-outline" size={16} color="#94A3B8" />
                <TextInput style={styles.input} value={form.numeroTarjeta} onChangeText={setCampoConMascara("numeroTarjeta", formatCardNumber)} placeholder="4111 1111 1111 1111" placeholderTextColor="#94A3B8" keyboardType="number-pad" />
                {marca ? <Text style={styles.inputBrand}>{marca}</Text> : null}
              </View>
              {errors.numeroTarjeta ? <Text style={styles.errorText}>{errors.numeroTarjeta}</Text> : null}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.half]}>
                <Text style={styles.fieldLabel}>Vencimiento (MM/AA)</Text>
                <View style={[styles.inputBox, errors.vencimiento && styles.inputBoxError]}>
                  <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                  <TextInput style={styles.input} value={form.vencimiento} onChangeText={setCampoConMascara("vencimiento", formatExpiry)} placeholder="12/28" placeholderTextColor="#94A3B8" keyboardType="number-pad" />
                </View>
                {errors.vencimiento ? <Text style={styles.errorText}>{errors.vencimiento}</Text> : null}
              </View>
              <View style={[styles.field, styles.half]}>
                <Text style={styles.fieldLabel}>CVV</Text>
                <View style={[styles.inputBox, errors.cvv && styles.inputBoxError]}>
                  <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
                  <TextInput style={styles.input} value={form.cvv} onChangeText={setCampoConMascara("cvv", formatCvv)} placeholder="123" placeholderTextColor="#94A3B8" keyboardType="number-pad" secureTextEntry />
                </View>
                {errors.cvv ? <Text style={styles.errorText}>{errors.cvv}</Text> : null}
              </View>
            </View>

            <TouchableOpacity disabled={pagando} style={[styles.payButton, pagando && styles.buttonDisabled]} onPress={handlePagar}>
              {pagando ? <ActivityIndicator color="#FFF" /> : <Ionicons name="lock-closed" size={16} color="#FFF" />}
              <Text style={styles.payButtonText}>Pagar anticipo {money(cita.deposit_amount)}</Text>
            </TouchableOpacity>

            <View style={styles.secureNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" />
              <Text style={styles.secureNoteText}>Pago 100% seguro. Tu información está protegida.</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#4338CA" />
            <Text style={styles.infoBoxText}>
              Este anticipo aparta tu hora y no se reembolsa si cancelas la cita. El resto ({money(cita.total - cita.deposit_amount)}) se paga en recepción el día de tu cita. Tu tarjeta no será guardada en nuestro sistema.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
