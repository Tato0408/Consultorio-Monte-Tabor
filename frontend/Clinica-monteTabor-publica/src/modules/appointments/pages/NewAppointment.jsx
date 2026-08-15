import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, ChevronDown, User, Clock, Stethoscope, CalendarDays, Timer, Wallet, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDoctors, getProcedures, bookAppointment } from "@/services/appointmentsService";
import { showError, showSuccess } from "@/lib/alerts";
import StepIndicator from "../components/StepIndicator";
import StepTipoAtencion from "../components/StepTipoAtencion";
import StepDoctor from "../components/StepDoctor";
import StepFechaHora from "../components/StepFechaHora";
import TicketCita from "../components/TicketCita";

// Indicaciones genéricas para una consulta general (los procedimientos traen las suyas propias)
const INDICACIONES_GENERALES = "Llega 10 minutos antes de tu cita con tu documento de identidad (DUI) a mano.";

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

const NewAppointment = () => {
  const navigate = useNavigate();
  const { patient, logout } = useAuth();

  const [step, setStep] = useState(1);
  const [procedures, setProcedures] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // "general" o el _id de un procedimiento
  const [tipo, setTipo] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmada, setConfirmada] = useState(null);
  const [metodoPago, setMetodoPago] = useState("reception");

  useEffect(() => {
    // Se usa allSettled (no all) para que si un catálogo falla, el otro igual se
    // muestre — antes, un solo endpoint caído bloqueaba todo el agendamiento
    Promise.allSettled([getDoctors(), getProcedures()]).then(([doctorsRes, proceduresRes]) => {
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);
      else showError("No se pudieron cargar los doctores disponibles.");

      if (proceduresRes.status === "fulfilled") setProcedures(proceduresRes.value);
      else showError("No se pudieron cargar los procedimientos disponibles.");

      setLoadingCatalogo(false);
    });
  }, []);

  const esGeneral = tipo === "general";
  const procedimientoSeleccionado = tipo && !esGeneral ? procedures.find((p) => p._id === tipo) : null;

  const duracion = esGeneral ? 30 : Number(procedimientoSeleccionado?.estimated_duration) || 30;
  const total = esGeneral ? 15 : Number(procedimientoSeleccionado?.price) || 0;
  // Solo referencial: el monto real del anticipo lo calcula y valida el servidor
  const deposito = Math.round(total * 0.5 * 100) / 100;
  const indicaciones = esGeneral
    ? INDICACIONES_GENERALES
    : procedimientoSeleccionado?.pre_care_instructions || INDICACIONES_GENERALES;
  const tipoLabel = esGeneral ? "Consulta médica general" : procedimientoSeleccionado?.name;
  const tipoDescription = esGeneral
    ? "Evaluación con un médico general para problemas de salud comunes."
    : procedimientoSeleccionado?.description;
  const doctorSeleccionado = doctors.find((d) => d._id === doctorId);

  // Elegir un nuevo tipo o doctor invalida la fecha/hora ya elegidas, porque la
  // duración y disponibilidad dependen de ambos
  const elegirTipo = (valor) => {
    setTipo(valor);
    setDate(null);
    setSlot(null);
  };

  const elegirDoctor = (valor) => {
    setDoctorId(valor);
    setDate(null);
    setSlot(null);
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const puedeContinuar = (step === 1 && !!tipo) || (step === 2 && !!doctorId) || (step === 3 && !!slot);

  const handleContinuar = () => {
    if (!puedeContinuar) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleConfirmar = async () => {
    setSubmitting(true);
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const res = await bookAppointment({
        doctor_id: doctorId,
        date: dateStr,
        start_time: slot.start_time,
        procedure_id: esGeneral ? undefined : tipo,
        payment_method: metodoPago,
      });

      // Si eligió pagar en línea, la cita queda "pending" y se pasa a la página de pago
      // propia (el formulario de tarjeta se muestra ahí dentro, en un iframe)
      if (res.requiresPayment) {
        navigate(`/agendar-cita/pagar?appointment=${res.appointment._id}`);
        return;
      }

      setConfirmada(res.appointment);
      showSuccess("¡Tu cita fue agendada con éxito!");
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
            <h1 className="text-2xl font-bold text-gray-900">Cita confirmada</h1>
            <p className="text-gray-500 text-sm mt-1">Te esperamos en la fecha y hora indicadas.</p>
          </div>

          <TicketCita
            doctor={confirmada.doctor_id}
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Cancelar
          </button>
          <span className="font-bold text-gray-800">Agendar cita</span>

          <div className="relative">
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
        <StepIndicator current={step} />

        {loadingCatalogo ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando...
          </div>
        ) : (
          <>
            {step === 4 ? (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-gray-900">¡Todo listo!</h2>
                  <p className="text-sm text-gray-500">Revisa los detalles y confirma tu cita.</p>
                </div>

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

                <TicketCita
                  doctor={doctorSeleccionado}
                  tipoLabel={tipoLabel}
                  generalidades={procedimientoSeleccionado?.description}
                  date={date}
                  startTime={slot.start_time}
                  endTime={slot.end_time}
                  total={total}
                  instructions={indicaciones}
                  pagoOnline={metodoPago === "online"}
                  deposit={deposito}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                {step === 1 && (
                  <StepTipoAtencion procedures={procedures} selected={tipo} onSelect={elegirTipo} />
                )}

                {step === 2 && (
                  <StepDoctor
                    doctors={doctors}
                    tipoLabel={tipoLabel}
                    tipoDescription={tipoDescription}
                    selected={doctorId}
                    onSelect={elegirDoctor}
                  />
                )}

                {step === 3 && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-w-0">
                      <StepFechaHora
                        doctorId={doctorId}
                        duration={duracion}
                        date={date}
                        slot={slot}
                        onSelectDate={setDate}
                        onSelectSlot={setSlot}
                      />
                    </div>

                    <div className="w-full lg:w-72 flex-shrink-0">
                      <div className="bg-gray-50 rounded-2xl p-5 sticky top-24">
                        <p className="font-semibold text-gray-800 text-sm mb-4">Resumen de tu cita</p>
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                          <div className="w-10 h-10 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {doctorSeleccionado?.img_url ? (
                              <img src={doctorSeleccionado.img_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-[#3B6FCA]" />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-800">
                            Dr. {doctorSeleccionado?.name} {doctorSeleccionado?.last_name}
                          </p>
                        </div>

                        <div className="space-y-3 pt-4 text-sm">
                          <div className="flex items-start gap-2">
                            <Stethoscope className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400">Tipo de atención</p>
                              <p className="font-medium text-gray-700">{tipoLabel}</p>
                            </div>
                          </div>
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
                                <p className="font-medium text-gray-700">{fmt12(slot.start_time)}</p>
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
                  </div>
                )}
              </div>
            )}

            <div className={`flex justify-between mt-6 ${step === 4 ? "max-w-xl mx-auto" : ""}`}>
              {step > 1 ? (
                <button onClick={goBack} disabled={submitting} className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 text-sm font-medium">
                  ← Atrás
                </button>
              ) : (
                <span />
              )}

              {step < 4 && (
                <button
                  disabled={!puedeContinuar}
                  onClick={handleContinuar}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 4 && (
                <button
                  onClick={handleConfirmar}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {metodoPago === "online" ? `Pagar anticipo de $${deposito.toFixed(2)}` : "Confirmar cita"}
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