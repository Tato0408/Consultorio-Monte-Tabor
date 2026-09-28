import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, Loader2, CheckCircle2, ShieldCheck, CreditCard,
  User, Mail, Lock, Calendar, Info, ClipboardList, Stethoscope, Clock, MapPin, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationsMenu from "@/components/NotificationsMenu";
import InputField from "@/components/ui/InputField";
import { getMyAppointments, confirmPayment } from "@/services/appointmentsService";
import { generarTokenWompi, tokenizarTarjeta, cobrarTarjeta } from "@/services/wompiService";
import { showError, showWarning } from "@/lib/alerts";
import {
  formatCardNumber, formatExpiry, formatCvv, detectarMarca, luhnValido, longitudValida,
  expiryValida, cvvValido, nombreValido, maskNombre, posicionCursorTrasFormatear,
} from "@/lib/paymentValidators";

// esCaracterContado del nombre: letras (con acentos/ñ), no dígitos como el resto de
// campos con máscara (tarjeta/vencimiento/cvv) — ver setCampoConMascara más abajo.
const esLetra = (c) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c);
import TicketCita from "../components/TicketCita";

const INDICACIONES_GENERALES = "Llega 10 minutos antes de tu cita con tu documento de identidad (DUI) a mano.";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Reintenta confirmar el pago varias veces antes de rendirse: confirm-payment nunca vuelve
// a cobrar la tarjeta (solo le pregunta a Wompi si esa transacción ya quedó aprobada), así
// que reintentarlo es seguro y ayuda a que un hipo de red no se confunda con un pago fallido.
const CONFIRM_REINTENTOS = 3;
const CONFIRM_ESPERA_MS = 2000;

const confirmarConReintentos = async (idCita, idTransaccion) => {
  let ultimoError;
  for (let intento = 1; intento <= CONFIRM_REINTENTOS; intento++) {
    try {
      return await confirmPayment(idCita, idTransaccion);
    } catch (err) {
      ultimoError = err;
      if (intento < CONFIRM_REINTENTOS) {
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_ESPERA_MS));
      }
    }
  }
  throw ultimoError;
};

// Página de pago propia: el formulario de tarjeta vive aquí mismo (no se redirige a
// ningún sitio externo). La tarjeta viaja una sola vez hacia Wompi para tokenizarla y
// cobrar; nunca se guarda en nuestro sitio. El backend vuelve a confirmar el resultado
// con sus propias credenciales antes de dar la cita por agendada.
const PayAppointment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patient, logout } = useAuth();
  const appointmentId = searchParams.get("appointment");

  const [cita, setCita] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [aprobada, setAprobada] = useState(null);
  const [pagoSinConfirmar, setPagoSinConfirmar] = useState(null);
  const [errors, setErrors] = useState({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [form, setForm] = useState({
    nombreCliente: "",
    emailCliente: "",
    numeroTarjeta: "",
    vencimiento: "",
    cvv: "",
  });

  useEffect(() => {
    if (patient) {
      setForm((f) => ({ ...f, nombreCliente: `${patient.name || ""} ${patient.last_name || ""}`.trim(), emailCliente: patient.email || "" }));
    }
  }, [patient]);

  useEffect(() => {
    if (!appointmentId) {
      setCargando(false);
      return;
    }
    getMyAppointments()
      .then((lista) => {
        const encontrada = lista.find((a) => a._id === appointmentId) || null;
        // Si el anticipo de esta cita ya quedó pagado (o la cita ya no está
        // "pending_payment", por ejemplo porque el doctor ya la aceptó, el paciente la
        // canceló, o ya se activó tras pagar), no se debe mostrar el formulario de
        // tarjeta de nuevo: volver a esta URL con el botón atrás del navegador, o
        // refrescar tras un redirect fallido, cobraría el anticipo una segunda vez del
        // lado de Wompi antes de que exista cualquier protección de idempotencia en el
        // backend. Antes esto comparaba contra "pending" (el estado post-pago, cuando el
        // doctor todavía no acepta) en vez de "pending_payment" (el estado real antes de
        // pagar), así que expulsaba al paciente de esta pantalla siempre, con cualquier
        // cita recién creada para pago en línea.
        if (encontrada && (encontrada.deposit_paid || encontrada.status !== "pending_payment")) {
          showWarning("Esta cita ya no está pendiente de pago.");
          navigate("/mis-citas", { replace: true });
          return;
        }
        setCita(encontrada);
      })
      .catch(() => showError("No se pudo cargar la información de la cita."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const marca = detectarMarca(form.numeroTarjeta);

  // Campos simples (sin máscara): solo actualizan el valor tal cual
  const setCampo = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: "" }));
  };

  // Guarda el último frame pendiente para reposicionar el cursor: si el usuario teclea
  // más rápido de lo que tarda un frame, se cancela el anterior para que no queden varias
  // correcciones de cursor en cola pisándose entre sí
  const rafCursorRef = useRef(null);

  // Campos con máscara (tarjeta, vencimiento, cvv, nombre): además de reformatear el
  // valor, se recalcula dónde debe quedar el cursor para que no salte al final en cada
  // tecla. esCaracterContado decide qué cuenta como "carácter real" para ese campo:
  // dígitos por defecto (tarjeta/vencimiento/cvv), letras para el nombre (ver esLetra).
  const setCampoConMascara = (campo, formateador, esCaracterContado = (c) => /\d/.test(c)) => (e) => {
    const input = e.target;
    const cursorPos = input.selectionStart ?? input.value.length;
    const contadosAntes = [...input.value.slice(0, cursorPos)].filter(esCaracterContado).length;
    const formateado = formateador(input.value);

    setForm((f) => ({ ...f, [campo]: formateado }));
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: "" }));

    if (rafCursorRef.current) cancelAnimationFrame(rafCursorRef.current);
    rafCursorRef.current = requestAnimationFrame(() => {
      const nuevaPos = posicionCursorTrasFormatear(formateado, contadosAntes, esCaracterContado);
      input.setSelectionRange(nuevaPos, nuevaPos);
    });
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

  const handlePagar = async (e) => {
    e.preventDefault();
    if (!cita) return;

    const erroresValidacion = validar();
    setErrors(erroresValidacion);
    if (Object.keys(erroresValidacion).length > 0) return;

    const [mes, anio] = form.vencimiento.split("/");

    setPagando(true);
    let idTransaccionCobrada = null;
    try {
      const { access_token } = await generarTokenWompi();

      const tokenTarjeta = await tokenizarTarjeta(access_token, {
        numeroTarjeta: form.numeroTarjeta.replace(/\s+/g, ""),
        cvv: form.cvv,
        mesVencimiento: Number(mes),
        anioVencimiento: 2000 + Number(anio),
      });

      const resultado = await cobrarTarjeta(access_token, {
        monto: cita.deposit_amount,
        emailCliente: form.emailCliente,
        nombreCliente: form.nombreCliente,
        tokenTarjeta: tokenTarjeta.token,
        configuracion: { notificarTransaccionCliente: true },
        datosAdicionales: { appointment_id: appointmentId },
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

  // Reintenta confirmar un pago que ya fue cobrado (desde la pantalla de "sin confirmar"
  // o desde el aviso de un intento anterior). Nunca vuelve a cobrar la tarjeta.
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // El banco ya aprobó el cobro pero no pudimos confirmarlo con nuestro servidor tras
  // varios intentos: se avisa claramente para que el paciente NO vuelva a pagar.
  if (pagoSinConfirmar) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tu pago fue aprobado</h1>
          <p className="text-gray-500 text-sm mt-2">
            El banco aprobó el cobro, pero no pudimos confirmarlo con tu cita todavía.
          </p>
          <p className="text-red-600 text-sm font-semibold mt-2">No vuelvas a pagar.</p>
          <p className="text-gray-500 text-sm mt-1">Guarda este número de referencia y vuelve a intentar confirmar en unos minutos:</p>
          <p className="mt-3 font-mono text-xs bg-gray-100 rounded-lg px-3 py-2 break-all">{pagoSinConfirmar}</p>

          <button
            onClick={() => reintentarConfirmacion(pagoSinConfirmar)}
            disabled={pagando}
            className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {pagando && <Loader2 className="w-4 h-4 animate-spin" />} Verificar de nuevo
          </button>
          <Link to="/mis-citas" className="block mt-3 text-sm font-semibold text-[#3B6FCA] hover:underline">
            Ver mis citas
          </Link>
        </div>
      </div>
    );
  }

  if (aprobada && cita) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">¡Pago aprobado!</h1>
            <p className="text-gray-500 text-sm mt-1">
              Tu anticipo quedó registrado. Tu cita queda pendiente de que {cita.nurse_id ? "la enfermera" : "el doctor"} la acepte.
            </p>
          </div>

          <TicketCita
            doctor={cita.doctor_id}
            nurse={cita.nurse_id}
            tipoLabel={cita.type}
            generalidades={(cita.procedure_id || []).map((p) => p.name).join(", ")}
            date={new Date(cita.date)}
            startTime={cita.start_time}
            endTime={cita.end_time}
            total={cita.total}
            instructions={INDICACIONES_GENERALES}
            pagoOnline
            deposit={cita.deposit_amount}
            depositPagado
          />

          <div className="flex gap-3 mt-6">
            <Link to="/mis-citas" className="flex-1 text-center py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors">
              Ver mis citas
            </Link>
            <Link to="/dashboard" className="flex-1 text-center py-3 rounded-xl border border-gray-200 hover:border-[#3B6FCA] text-gray-600 font-semibold text-sm transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/mis-citas")} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Cancelar
          </button>
          <span className="font-bold text-gray-800">Pagar cita</span>

          <div className="relative flex items-center gap-1">
            <NotificationsMenu />
            <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-semibold text-sm flex-shrink-0">
                {patient?.name?.[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{patient?.name} {patient?.last_name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                  <Link to="/profile" className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" /> Mi perfil
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : !cita ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No se encontró la cita.</p>
            <Link to="/mis-citas" className="text-sm font-semibold text-[#3B6FCA] hover:underline mt-2 inline-block">Volver a mis citas</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* ── Columna principal ── */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-[#3B6FCA]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Información de pago</h1>
                  <p className="text-sm text-gray-500">Completa los datos de tu tarjeta para realizar el pago de tu cita.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Detalle de la cita</p>
                    <p className="font-semibold text-gray-800 truncate">
                      {cita.doctor_id
                        ? `Dr. ${cita.doctor_id.name} ${cita.doctor_id.last_name}`
                        : cita.nurse_id
                          ? `${cita.nurse_id.name} ${cita.nurse_id.last_name}`
                          : "Por asignar"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{cita.type}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-gray-900">${Number(cita.deposit_amount).toFixed(2)}</p>
                  <span className="text-xs text-gray-400">Anticipo (de ${Number(cita.total).toFixed(2)})</span>
                </div>
              </div>

              {cita.wompi_transaction_id && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Ya existe un intento de pago para esta cita</p>
                    <p className="text-xs text-amber-700 mt-0.5">Verifica si ese cobro ya fue aprobado antes de pagar de nuevo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => reintentarConfirmacion(cita.wompi_transaction_id)}
                    disabled={pagando}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    Verificar
                  </button>
                </div>
              )}

              <form onSubmit={handlePagar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#3B6FCA] font-semibold text-sm mb-1">
                  <CreditCard className="w-4 h-4" /> Datos de la tarjeta
                </div>

                <InputField
                  label="Nombre completo"
                  id="nombreCliente"
                  icon={<User className="w-4 h-4" />}
                  value={form.nombreCliente}
                  onChange={setCampoConMascara("nombreCliente", maskNombre, esLetra)}
                  error={errors.nombreCliente}
                  placeholder="Como aparece en la tarjeta"
                />

                <InputField
                  label="Correo electrónico"
                  id="emailCliente"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={form.emailCliente}
                  onChange={setCampo("emailCliente")}
                  error={errors.emailCliente}
                  placeholder="tucorreo@ejemplo.com"
                />

                <InputField
                  label="Número de tarjeta"
                  id="numeroTarjeta"
                  inputMode="numeric"
                  icon={<CreditCard className="w-4 h-4" />}
                  rightSlot={marca && <span className="text-xs font-bold text-gray-400 uppercase">{marca}</span>}
                  value={form.numeroTarjeta}
                  onChange={setCampoConMascara("numeroTarjeta", formatCardNumber)}
                  error={errors.numeroTarjeta}
                  placeholder="4111 1111 1111 1111"
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Vencimiento (MM/AA)"
                    id="vencimiento"
                    inputMode="numeric"
                    icon={<Calendar className="w-4 h-4" />}
                    value={form.vencimiento}
                    onChange={setCampoConMascara("vencimiento", formatExpiry)}
                    error={errors.vencimiento}
                    placeholder="12/28"
                  />
                  <InputField
                    label="CVV"
                    id="cvv"
                    inputMode="numeric"
                    icon={<Lock className="w-4 h-4" />}
                    rightSlot={<Info className="w-3.5 h-3.5 text-gray-300" />}
                    value={form.cvv}
                    onChange={setCampoConMascara("cvv", formatCvv)}
                    error={errors.cvv}
                    placeholder="123"
                  />
                </div>

                <button type="submit" disabled={pagando}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors disabled:opacity-60 mt-2">
                  {pagando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Pagar anticipo ${Number(cita.deposit_amount).toFixed(2)}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-300" />
                  Pago 100% seguro. Tu información está protegida y encriptada.
                </p>
              </form>

              <div className="flex items-start gap-2 bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-xl p-4">
                <Info className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  Este anticipo aparta tu hora. <span className="font-semibold text-gray-800">Si cancelas la cita después de pagarlo, por política de la clínica este monto no se te reembolsa.</span> El resto (${Number(cita.total - cita.deposit_amount).toFixed(2)}) se paga en recepción el día de tu cita. Tu tarjeta no será guardada en nuestro sistema.
                </p>
              </div>
            </div>

            {/* ── Resumen ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-[#3B6FCA]" />
                </div>
                <h2 className="font-bold text-gray-900">Resumen de tu cita</h2>
              </div>

              <div className="space-y-3 text-sm border-b border-gray-100 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><Stethoscope className="w-4 h-4" /> Tipo de atención</span>
                  <span className="font-medium text-gray-800 text-right">{cita.type}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><User className="w-4 h-4" /> Doctor(a)</span>
                  <span className="font-medium text-gray-800 text-right">
                    {cita.doctor_id
                      ? `Dr. ${cita.doctor_id.name} ${cita.doctor_id.last_name}`
                      : cita.nurse_id
                        ? `${cita.nurse_id.name} ${cita.nurse_id.last_name}`
                        : "Por asignar"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><Calendar className="w-4 h-4" /> Fecha</span>
                  <span className="font-medium text-gray-800 text-right capitalize">{fmtFecha(cita.date)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><Clock className="w-4 h-4" /> Hora</span>
                  <span className="font-medium text-gray-800 text-right">{fmt12(cita.start_time)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><Clock className="w-4 h-4" /> Duración</span>
                  <span className="font-medium text-gray-800 text-right">{cita.duration_minutes} minutos</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-gray-400"><MapPin className="w-4 h-4" /> Sede</span>
                  <span className="font-medium text-gray-800 text-right">San Salvador, El Salvador</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Total de la cita</span>
                  <span>${Number(cita.total).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Resto en recepción</span>
                  <span>${Number(cita.total - cita.deposit_amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="font-semibold text-gray-800">Anticipo a pagar ahora</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-[#3B6FCA]">${Number(cita.deposit_amount).toFixed(2)}</span>
                    <span className="text-xs text-gray-400">USD</span>
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Transacción segura</p>
                  <p className="text-xs text-emerald-600/80">Utilizamos tecnología de seguridad de nivel bancario.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayAppointment;