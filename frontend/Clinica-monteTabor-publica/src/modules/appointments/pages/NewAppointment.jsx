import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, ChevronDown, Clock, Stethoscope, CalendarDays, Timer, Wallet, CreditCard, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProcedures, getSchedulableDoctors, bookAppointment, rescheduleAppointment } from "@/services/appointmentsService";
import { showError, showSuccess } from "@/lib/alerts";
import NotificationsMenu from "@/components/NotificationsMenu";
import StepIndicator from "../components/StepIndicator";
import StepTipoAtencion from "../components/StepTipoAtencion";
import StepChooseDoctor from "../components/StepChooseDoctor";
import StepFechaHora from "../components/StepFechaHora";
import TicketCita from "../components/TicketCita";

// Indicaciones de respaldo cuando un procedimiento no tiene las suyas propias configuradas
// (pre_care_instructions vacío) — incluida la Consulta Médica General, que ahora es un
// procedimiento real más.
const INDICACIONES_RESPALDO = "Llega 10 minutos antes de tu cita con tu documento de identidad (DUI) a mano.";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFechaLarga = (d) =>
  d.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const METODOS_PAGO = [
  { key: "reception", icon: Wallet, title: "Pagar en recepción", description: "Paga el total en efectivo o con tarjeta el día de tu cita." },
  { key: "online", icon: CreditCard, title: "Pagar anticipo en línea", description: "Aparta tu hora pagando el 50% ahora (modo de prueba con Wompi). El resto se paga en recepción." },
];

// Interruptor de modo del paso 2: "rápido" (por defecto) muestra primero los horarios
// agregados entre todos los doctores, igual que la app móvil, y la cita queda sin
// asignar (cualquier doctor disponible la acepta). "doctor" invierte el orden: se
// elige doctor primero y luego se filtra el calendario a sus días y horas reales,
// agregando un paso más al asistente (ver StepIndicator.PASOS_POR_MODO). requiresDoctor
// solo cambia la etiqueta del segundo botón: cuando el procedimiento no requiere
// doctor (ver requiresDoctorForProcedure), ese modo elige enfermera en su lugar.
const ModeToggle = ({ modo, onChange, requiresDoctor = true }) => (
  <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
    <button
      type="button"
      onClick={() => onChange("rapido")}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        modo === "rapido" ? "bg-white text-[#3B6FCA] shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      Horario primero
    </button>
    <button
      type="button"
      onClick={() => onChange("doctor")}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        modo === "doctor" ? "bg-white text-[#3B6FCA] shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {requiresDoctor ? "Elegir doctor primero" : "Elegir enfermera primero"}
    </button>
  </div>
);

// Barra lateral con el resumen de lo elegido hasta el momento. Se reutiliza tanto en
// el paso de horario agregado (modo rápido) como en el paso de horario ya filtrado
// por proveedor (modo doctor), por eso las filas de doctor y enfermera son opcionales
// (y nunca llegan definidas a la vez).
const ResumenCita = ({ tipoLabel, doctor, nurse, date, slot, duracion }) => (
  <div className="w-full lg:w-72 flex-shrink-0">
    <div className="bg-gray-50 rounded-2xl p-5 sticky top-24">
      <p className="font-semibold text-gray-800 text-sm mb-4">Resumen de tu cita</p>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Stethoscope className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Tipo de atención</p>
            <p className="font-medium text-gray-700">{tipoLabel}</p>
          </div>
        </div>
        {doctor && (
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Doctor</p>
              <p className="font-medium text-gray-700">Dr. {doctor.name} {doctor.last_name}</p>
            </div>
          </div>
        )}
        {nurse && (
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Enfermera</p>
              <p className="font-medium text-gray-700">{nurse.name} {nurse.last_name}</p>
            </div>
          </div>
        )}
        {date && (
          <div className="flex items-start gap-2">
            <CalendarDays className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Fecha</p>
              <p className="font-medium text-gray-700 capitalize">{fmtFechaLarga(date)}</p>
            </div>
          </div>
        )}
        {slot && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Hora</p>
              <p className="font-medium text-gray-700">{fmt12(slot.start_time)} - {fmt12(slot.end_time)}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Timer className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Duración</p>
            <p className="font-medium text-gray-700">{duracion} minutos</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#3B6FCA]/5 rounded-xl p-3 mt-4">
        <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-gray-700">Llegar 10 minutos antes</p>
          <p className="text-xs text-gray-500 mt-0.5">Te recomendamos llegar unos minutos antes de tu cita.</p>
        </div>
      </div>
    </div>
  </div>
);

const NewAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, logout } = useAuth();

  const [step, setStep] = useState(1);
  const [procedures, setProcedures] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Con muchos procedimientos (o sin usar el buscador) elegir uno queda fuera de la vista si
  // el botón Continuar está más abajo de lo que se ve en pantalla; se hace scroll automático
  // hacia él apenas se elige un tipo de atención, para que el paciente no tenga que buscarlo.
  const continuarRef = useRef(null);

  // El _id de un procedimiento del catálogo (incluida la Consulta Médica General, que ya
  // no es un caso especial)
  const [tipo, setTipo] = useState(null);
  // "rapido" (por defecto, sin doctor) o "doctor" (elige doctor antes que fecha/hora)
  const [modo, setModo] = useState("rapido");
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  // Solo se usa en modo "doctor". En modo "rapido" la cita queda sin asignar.
  const [doctor, setDoctor] = useState(null);
  // Igual que doctor, pero para cuando el procedimiento elegido no requiere doctor (ver
  // requiresDoctorForProcedure más abajo): ahí la enfermera es la proveedora principal
  // en modo "doctor", nunca doctor y nurse llegan elegidos a la vez.
  const [nurse, setNurse] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmada, setConfirmada] = useState(null);
  const [metodoPago, setMetodoPago] = useState("reception");
  // Cuando llega desde "Reagendar" en Mis citas (cita "por reagendar" o "pending"): guarda
  // el _id de la cita a reusar. En este modo el tipo de atención no se puede cambiar (paso 1
  // bloqueado), no se vuelve a cobrar (el anticipo ya pagado viaja con el mismo registro) y
  // al confirmar se llama a rescheduleAppointment en vez de bookAppointment.
  const [rescheduleId, setRescheduleId] = useState(null);
  // Motivo de consulta: opcional, el backend lo acepta y lo guarda (ver
  // patientPortalController.bookAppointment) pero este asistente nunca lo pedía —
  // a diferencia de la app móvil, un doctor nunca veía por qué el paciente agendó.
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");

  useEffect(() => {
    getProcedures()
      .then(setProcedures)
      .catch(() => showError("No se pudieron cargar los procedimientos disponibles."))
      .finally(() => setLoadingCatalogo(false));
  }, []);

  // Viene de "Reagendar cita" en Mis citas (ver MyAppointments.jsx): trae el tipo de
  // atención, doctor y motivo de la cita cancelada, y salta directo al paso de fecha y
  // hora para que el paciente no tenga que volver a llenar todo desde cero.
  useEffect(() => {
    // "reschedule" (reagendar una cita existente reusando su registro) y "prefill"
    // (cancelar + agendar de nuevo) comparten los mismos campos para precargar el
    // asistente; solo cambia que "reschedule" además fija rescheduleId.
    const reschedule = location.state?.reschedule;
    const prefill = reschedule || location.state?.prefill;
    if (!prefill) return;
    if (reschedule?.appointmentId) setRescheduleId(reschedule.appointmentId);
    setMotivo(prefill.motivo || "");
    // Una cita histórica sin procedure_id (de antes de que la Consulta Médica General
    // fuera un procedimiento real) no trae con qué precargar el paso 1: se deja en el
    // paso 1 (el valor inicial de step) para que el paciente elija un procedimiento
    // explícitamente, en vez de saltar a un paso que depende de un tipo ya elegido.
    if (prefill.tipo) {
      setTipo(prefill.tipo);
      if (prefill.doctorId) {
        setModo("doctor");
        getSchedulableDoctors()
          .then((list) => {
            const encontrado = list.find((d) => d._id === prefill.doctorId);
            if (encontrado) {
              setDoctor(encontrado);
              setStep(3);
            } else {
              // El doctor de la cita anterior ya no está disponible: se vuelve al modo
              // rápido en vez de dejar el asistente atascado sin poder avanzar.
              setModo("rapido");
              setStep(2);
            }
          })
          .catch(() => { setModo("rapido"); setStep(2); });
      } else {
        setStep(2);
      }
    }
    // Se limpia el state de navegación para que un refresh no vuelva a aplicar el
    // prefill (y, sobre todo, para que no reaparezca si el paciente navega para atrás).
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const procedimientoSeleccionado = tipo ? procedures.find((p) => p._id === tipo) : null;

  // Un procedimiento sin doctor (requires_doctor false) lo atiende una enfermera como
  // proveedora principal, en vez de un doctor. Sin procedimiento elegido todavía, por
  // defecto se asume que sí requiere doctor (undefined !== false).
  const requiresDoctorForProcedure = procedimientoSeleccionado?.requires_doctor !== false;

  const duracion = Number(procedimientoSeleccionado?.estimated_duration) || 30;
  const total = Number(procedimientoSeleccionado?.price) || 0;
  // Solo referencial: el monto real del anticipo lo calcula y valida el servidor
  const deposito = Math.round(total * 0.5 * 100) / 100;
  const indicaciones = procedimientoSeleccionado?.pre_care_instructions || INDICACIONES_RESPALDO;
  const tipoLabel = procedimientoSeleccionado?.name;
  const tipoDescription = procedimientoSeleccionado?.description;

  const totalSteps = modo === "doctor" ? 4 : 3;

  // Elegir un nuevo tipo invalida la fecha/hora/proveedor ya elegidos, porque la
  // duración, disponibilidad y si aplica doctor o enfermera dependen del tipo.
  const elegirTipo = (valor) => {
    setTipo(valor);
    setDate(null);
    setSlot(null);
    setDoctor(null);
    setNurse(null);
    continuarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Cambiar de modo dentro del paso 2 invalida todo lo elegido después de ese paso:
  // los dos modos calculan la disponibilidad de forma distinta (agregada entre todos
  // los doctores/enfermeras vs. filtrada a un proveedor puntual), así que no tiene
  // sentido conservarlo.
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setDate(null);
    setSlot(null);
    setDoctor(null);
    setNurse(null);
  };

  // Elige el proveedor principal del modo "doctor": el doctor normalmente, o la
  // enfermera cuando el procedimiento no requiere doctor (ver requiresDoctorForProcedure).
  const elegirProveedor = (valor) => {
    if (requiresDoctorForProcedure) setDoctor(valor); else setNurse(valor);
    setDate(null);
    setSlot(null);
  };

  const elegirFecha = (valor) => {
    setDate(valor);
    setSlot(null);
  };

  const elegirSlot = (valor) => setSlot(valor);

  // En modo reagendar el paso 1 (tipo de atención) queda bloqueado: el tipo lo define la
  // cita original y el backend lo ignora si se manda otro.
  const goBack = () => setStep((s) => Math.max(rescheduleId ? 2 : 1, s - 1));

  const puedeContinuar =
    (step === 1 && !!tipo) ||
    (step === 2 && modo === "rapido" && !!slot) ||
    (step === 2 && modo === "doctor" && (requiresDoctorForProcedure ? !!doctor : !!nurse)) ||
    (step === 3 && modo === "doctor" && !!slot);

  const handleContinuar = () => {
    if (!puedeContinuar) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleConfirmar = async () => {
    const motivoLimpio = motivo.trim();
    if (motivoLimpio && (motivoLimpio.length < 3 || motivoLimpio.length > 500)) {
      setMotivoError("El motivo debe tener entre 3 y 500 caracteres.");
      return;
    }
    setMotivoError("");
    setSubmitting(true);
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      // Modo reagendar: se reusa el mismo registro (conserva anticipo y total), nunca se
      // vuelve a cobrar y no pasa por la página de pago.
      if (rescheduleId) {
        const { appointment } = await rescheduleAppointment(rescheduleId, {
          doctor_id: requiresDoctorForProcedure ? doctor?._id : undefined,
          nurse_id: requiresDoctorForProcedure ? undefined : nurse?._id,
          date: dateStr,
          start_time: slot.start_time,
        });
        setConfirmada(appointment);
        showSuccess("¡Cita reagendada! Queda pendiente de que un profesional la acepte.");
        return;
      }

      const res = await bookAppointment({
        // undefined en modo rápido (o cuando no se eligió proveedor puntual): el
        // backend crea la cita sin asignar y notifica a todos los doctores activos (o
        // enfermeras, si el procedimiento no requiere doctor), cualquiera puede
        // aceptarla. Nunca se envían doctor_id y nurse_id a la vez.
        doctor_id: requiresDoctorForProcedure ? doctor?._id : undefined,
        nurse_id: requiresDoctorForProcedure ? undefined : nurse?._id,
        date: dateStr,
        start_time: slot.start_time,
        procedure_id: tipo,
        payment_method: metodoPago,
        description: motivoLimpio || undefined,
      });

      // Si eligió pagar en línea, la cita queda "pending" y se pasa a la página de pago
      // propia (el formulario de tarjeta se muestra ahí dentro, en un iframe)
      if (res.requiresPayment) {
        navigate(`/agendar-cita/pagar?appointment=${res.appointment._id}`);
        return;
      }

      setConfirmada(res.appointment);
      const proveedorElegido = requiresDoctorForProcedure ? doctor : nurse;
      showSuccess(
        proveedorElegido
          ? `¡Solicitud enviada! Queda pendiente de que ${requiresDoctorForProcedure ? "el doctor" : "la enfermera"} la acepte.`
          : `¡Solicitud enviada! Queda pendiente de que ${requiresDoctorForProcedure ? "algún doctor disponible" : "alguna enfermera disponible"} la acepte.`
      );
    } catch (err) {
      showError(err.message || "No se pudo agendar la cita.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pantalla de confirmación ──
  if (confirmada) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{rescheduleId ? "Cita reagendada" : "Solicitud enviada"}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {confirmada.doctor_id
                ? "Tu cita queda pendiente de que el doctor la acepte. Te avisaremos cuando lo haga."
                : confirmada.nurse_id
                  ? "Tu cita queda pendiente de que la enfermera la acepte. Te avisaremos cuando lo haga."
                  : requiresDoctorForProcedure
                    ? "Tu cita queda pendiente de que algún doctor disponible la acepte. Te avisaremos cuando lo haga."
                    : "Tu cita queda pendiente de que alguna enfermera disponible la acepte. Te avisaremos cuando lo haga."}
            </p>
          </div>

          <TicketCita
            doctor={confirmada.doctor_id}
            nurse={confirmada.nurse_id}
            requiresDoctor={requiresDoctorForProcedure}
            tipoLabel={tipoLabel}
            generalidades={procedimientoSeleccionado?.description}
            date={new Date(confirmada.date)}
            startTime={confirmada.start_time}
            endTime={confirmada.end_time}
            total={confirmada.total}
            instructions={indicaciones}
          />

          <div className="flex gap-3 mt-6">
            <Link
              to="/mis-citas"
              className="flex-1 text-center py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors"
            >
              Ver mis citas
            </Link>
            <Link
              to="/dashboard"
              className="flex-1 text-center py-3 rounded-xl border border-gray-200 hover:border-[#3B6FCA] text-gray-600 font-semibold text-sm transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ──
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Cancelar
          </button>
          <span className="font-bold text-gray-800">{rescheduleId ? "Reagendar cita" : "Agendar cita"}</span>

          {/* "relative" en este contenedor conjunto (no en cada botón por separado) es lo
              que evita que el dropdown de notificaciones se desborde por la izquierda en
              pantallas angostas, ver el mismo criterio documentado en Dashboard.jsx. */}
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
        <StepIndicator current={step} modo={modo} requiresDoctor={requiresDoctorForProcedure} />

        {loadingCatalogo ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : (
          <>
            {/* Mismo ancho/alineación horizontal que tenía abajo (max-w-xl centrado en el
                último paso, ancho completo del contenedor en el resto), solo que ahora arriba
                del recuadro blanco en vez de debajo, junto al botón Continuar/Confirmar. */}
            {step > (rescheduleId ? 2 : 1) && (
              <div className={`mb-4 ${step === totalSteps ? "max-w-xl mx-auto" : ""}`}>
                <button onClick={goBack} disabled={submitting} className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 text-sm font-medium">
                  ← Atrás
                </button>
              </div>
            )}

            {step === totalSteps ? (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-gray-900">{rescheduleId ? "Confirma el nuevo horario" : "¡Todo listo!"}</h2>
                  <p className="text-sm text-gray-500">
                    {rescheduleId
                      ? "Revisa la nueva fecha y hora. Un profesional debe aceptar la cita para confirmarla."
                      : "Revisa los detalles y confirma tu cita."}
                  </p>
                </div>

                {!rescheduleId && (
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {METODOS_PAGO.map(({ key, icon: Icon, title, description }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMetodoPago(key)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${
                          metodoPago === key ? "border-[#3B6FCA] bg-[#3B6FCA]/5" : "border-gray-100 hover:border-[#3B6FCA]/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-[#3B6FCA]" />
                          <span className="font-semibold text-sm text-gray-800">{title}</span>
                        </div>
                        <p className="text-xs text-gray-500">{description}</p>
                      </button>
                    ))}
                  </div>
                )}

                <TicketCita
                  doctor={doctor}
                  nurse={nurse}
                  requiresDoctor={requiresDoctorForProcedure}
                  tipoLabel={tipoLabel}
                  generalidades={procedimientoSeleccionado?.description}
                  date={date}
                  startTime={slot.start_time}
                  endTime={slot.end_time}
                  total={total}
                  instructions={indicaciones}
                  pagoOnline={!rescheduleId && metodoPago === "online"}
                  deposit={deposito}
                />

                {rescheduleId ? (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mt-4">
                    Si ya pagaste un anticipo para esta cita, se mantiene: al reagendar no se
                    genera un nuevo cobro.
                  </p>
                ) : (
                  <div className="mt-4">
                    <label htmlFor="motivo" className="text-sm font-semibold text-gray-800">
                      Motivo de la consulta <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      id="motivo"
                      value={motivo}
                      onChange={(e) => { setMotivo(e.target.value); if (motivoError) setMotivoError(""); }}
                      maxLength={500}
                      rows={3}
                      placeholder="Cuéntanos brevemente el motivo de tu consulta, para que el doctor llegue mejor preparado."
                      className={`w-full mt-2 px-3 py-2.5 text-sm rounded-xl border resize-none focus:outline-none transition-colors ${
                        motivoError
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-gray-200 bg-gray-50 focus:border-[#3B6FCA] focus:bg-white"
                      }`}
                    />
                    <div className="flex justify-between items-start mt-1">
                      {motivoError ? (
                        <span className="text-xs text-red-500 font-medium">{motivoError}</span>
                      ) : <span />}
                      <span className="text-[11px] text-gray-400 ml-auto">{motivo.length}/500</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                {step === 1 && (
                  <StepTipoAtencion procedures={procedures} selected={tipo} onSelect={elegirTipo} />
                )}

                {step === 2 && (
                  <div>
                    <ModeToggle modo={modo} onChange={cambiarModo} requiresDoctor={requiresDoctorForProcedure} />

                    {modo === "rapido" ? (
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 min-w-0">
                          <StepFechaHora
                            procedureId={tipo}
                            date={date}
                            slot={slot}
                            onSelectDate={elegirFecha}
                            onSelectSlot={elegirSlot}
                          />
                        </div>
                        <ResumenCita tipoLabel={tipoLabel} doctor={null} nurse={null} date={date} slot={slot} duracion={duracion} />
                      </div>
                    ) : (
                      <StepChooseDoctor
                        tipoLabel={tipoLabel}
                        tipoDescription={tipoDescription}
                        selected={requiresDoctorForProcedure ? doctor : nurse}
                        onSelect={elegirProveedor}
                        requiresDoctor={requiresDoctorForProcedure}
                      />
                    )}
                  </div>
                )}

                {step === 3 && modo === "doctor" && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-w-0">
                      <StepFechaHora
                        doctor={doctor}
                        nurse={nurse}
                        duration={duracion}
                        date={date}
                        slot={slot}
                        onSelectDate={elegirFecha}
                        onSelectSlot={elegirSlot}
                      />
                    </div>
                    <ResumenCita tipoLabel={tipoLabel} doctor={doctor} nurse={nurse} date={date} slot={slot} duracion={duracion} />
                  </div>
                )}
              </div>
            )}

            <div className={`flex justify-end mt-6 ${step === totalSteps ? "max-w-xl mx-auto" : ""}`}>
              {step < totalSteps && (
                <button
                  ref={continuarRef}
                  disabled={!puedeContinuar}
                  onClick={handleContinuar}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === totalSteps && (
                <button
                  onClick={handleConfirmar}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {rescheduleId
                    ? "Reagendar cita"
                    : metodoPago === "online"
                      ? `Pagar anticipo de $${deposito.toFixed(2)}`
                      : "Confirmar cita"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewAppointment;
