import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck, ShieldCheck, Stethoscope, HeartPulse, Clock, MapPin,
  ListChecks, UserRound, Ticket, User, ArrowRight, ArrowUpRight, ChevronDown, Users, FileText,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

const Logo = ({ size = 36 }) => (
  <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size * 0.875, height: size }}>
    <svg viewBox="0 0 56 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
      <polygon points="28,2 54,17 54,47 28,62 2,47 2,17" fill="#3B6FCA" />
    </svg>
    <span className="relative z-10 text-white font-bold select-none" style={{ fontSize: size * 0.32 }}>T</span>
  </div>
);

const services = [
  {
    icon: Stethoscope,
    title: "Consulta general",
    description: "Atención médica integral con un equipo de doctores certificados para toda la familia.",
  },
  {
    icon: CalendarCheck,
    title: "Citas en línea",
    description: "Elige tu doctor y horario, y agenda tu cita en minutos desde cualquier lugar.",
    destacado: true,
  },
  {
    icon: HeartPulse,
    title: "Seguimiento clínico",
    description: "Acompañamiento cercano de nuestro equipo médico en cada etapa de tu tratamiento.",
  },
];

const pasosAgendar = [
  {
    icon: ListChecks,
    title: "Elige tu atención",
    description: "Selecciona si necesitas una consulta general o un procedimiento específico.",
  },
  {
    icon: UserRound,
    title: "Elige doctor y horario",
    description: "Consulta la disponibilidad real de nuestros doctores y elige el horario que prefieras.",
  },
  {
    icon: Ticket,
    title: "Confirma tu cita",
    description: "Revisa el resumen con el precio y las indicaciones, y confirma. Así de simple.",
  },
];

const beneficios = [
  "Historial, recetas y documentos médicos digitales",
  "Pago de tu cita en línea, de forma segura",
  "Agenda disponible en cualquier momento, sin llamadas",
];

const preguntasFrecuentes = [
  {
    pregunta: "¿Cómo agendo una cita?",
    respuesta: "Crea tu cuenta de paciente, inicia sesión y sigue el asistente de 'Agendar cita': primero eliges el tipo de atención, luego el doctor, después el horario disponible y por último confirmas con el resumen de tu cita.",
  },
  {
    pregunta: "¿Puedo cancelar una cita ya agendada?",
    respuesta: "Sí. Desde la sección 'Mis citas' de tu portal puedes cancelar cualquier cita que todavía no haya sido atendida.",
  },
  {
    pregunta: "¿Qué pasa después de confirmar mi cita?",
    respuesta: "Verás un ticket con el doctor, el tipo de atención, el día, la hora, el monto a pagar y las indicaciones a seguir antes de tu consulta.",
  },
];

const Home = () => {
  const [doctores, setDoctores] = useState([]);
  const [faqAbierta, setFaqAbierta] = useState(0);

  useEffect(() => {
    apiClient("/doctors")
      .then((data) => setDoctores(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setDoctores([]));
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-3 z-20 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur border border-gray-100 shadow-sm shadow-gray-200/60 rounded-2xl px-5 sm:px-7 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-bold text-gray-800 tracking-tight leading-tight text-sm sm:text-base">
              Clínica Familiar<br className="hidden sm:block" /> Monte Tabor
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#servicios" className="hover:text-[#3B6FCA] transition-colors">Servicios</a>
            <a href="#nosotros" className="hover:text-[#3B6FCA] transition-colors">Nosotros</a>
            <a href="#contacto" className="hover:text-[#3B6FCA] transition-colors">Contacto</a>
          </nav>

          <Link
            to="/login"
            className="py-2.5 px-5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-14 sm:pt-20 pb-24 sm:pb-32">
        <div
          className="absolute rounded-full -z-10"
          style={{
            width: "60%", paddingBottom: "60%", top: "-20%", right: "-10%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
            opacity: 0.08,
          }}
        />
        <div className="max-w-6xl mx-auto px-6 sm:px-8 grid lg:grid-cols-2 gap-16 items-center">
          {/* Columna de texto */}
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#3B6FCA]/10 text-[#3B6FCA] text-xs font-semibold tracking-wide mb-6">
              Salud para toda tu familia
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-gray-900">
              Cuidamos de ti,
              <br />
              <span className="text-[#3B6FCA]">en cada etapa de tu vida</span>
            </h1>
            <p className="mt-6 text-gray-500 text-lg leading-relaxed max-w-lg">
              En Clínica Familia Monte Tabor combinamos atención médica cercana
              con tecnología moderna para que gestionar tu salud sea simple,
              rápido y seguro.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="flex items-center gap-2 py-3.5 px-8 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
              >
                Crear una cuenta <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="py-3.5 px-8 rounded-xl border border-gray-200 hover:border-[#3B6FCA] text-gray-700 hover:text-[#3B6FCA] font-semibold text-sm tracking-wide transition-all duration-200"
              >
                Iniciar sesión
              </Link>
            </div>

            {doctores.length > 0 && (
              <div className="mt-9 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {doctores.slice(0, 4).map((d) => (
                    <div key={d._id} className="w-9 h-9 rounded-full border-2 border-white bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden">
                      {d.img_url ? (
                        <img src={d.img_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-[#3B6FCA]" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Atendido por un equipo de <span className="font-semibold text-gray-700">{doctores.length}+ doctores certificados</span>
                </p>
              </div>
            )}

            <div className="mt-6 inline-flex items-center gap-2.5 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              <ShieldCheck className="w-5 h-5 text-[#3B6FCA] flex-shrink-0" />
              <span>Tus datos médicos siempre protegidos con encriptación avanzada</span>
            </div>
          </div>

          {/* Columna visual */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="relative aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-[#4A7FD4] to-[#1E4BAD] shadow-2xl shadow-[#3B6FCA]/30 overflow-hidden flex items-center justify-center">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
              <HeartPulse className="w-24 h-24 sm:w-28 sm:h-28 text-white/90" strokeWidth={1.5} />
            </div>

            <div className="absolute -top-5 -left-5 sm:-left-8 bg-white rounded-2xl shadow-lg shadow-gray-200/60 px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#3B6FCA]" />
              </div>
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Atención cercana</span>
            </div>

            <div className="absolute -bottom-5 -right-3 sm:-right-8 bg-white rounded-2xl shadow-lg shadow-gray-200/60 px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-4 h-4 text-[#3B6FCA]" />
              </div>
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Equipo certificado</span>
            </div>
          </div>
        </div>

        {/* Franja de valores reales del sistema */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 mt-16 sm:mt-20">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 p-6 sm:py-8">
            {[
              { icon: FileText, title: "Historial digital", desc: "Recetas y documentos en un solo lugar" },
              { icon: ShieldCheck, title: "Pago seguro", desc: "Aparta tu cita pagando en línea" },
              { icon: Stethoscope, title: "Equipo certificado", desc: doctores.length > 0 ? `${doctores.length}+ doctores disponibles` : "Doctores disponibles" },
              { icon: Clock, title: "Agenda 24/7", desc: "Sin llamadas ni filas de espera" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`text-center px-3 py-4 sm:py-0 ${i % 2 === 0 ? "border-r-0 sm:border-r" : ""}`}>
                <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#3B6FCA]" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Todo lo que necesitas, en un solo lugar
          </h2>
          <p className="mt-4 text-gray-500 text-base leading-relaxed">
            Desde tu primera consulta hasta el seguimiento de tu historial, te
            acompañamos en cada paso.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(({ icon: Icon, title, description, destacado }) => (
            <div
              key={title}
              className={`relative p-7 rounded-2xl transition-all duration-300 group ${
                destacado
                  ? "bg-gradient-to-br from-[#4A7FD4] to-[#1E4BAD] shadow-xl shadow-[#3B6FCA]/25 sm:-translate-y-3"
                  : "border border-gray-100 hover:border-[#3B6FCA]/30 hover:shadow-xl hover:shadow-[#3B6FCA]/5"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${
                    destacado ? "bg-white/15" : "bg-[#3B6FCA]/10"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${destacado ? "text-white" : "text-[#3B6FCA]"}`} />
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:rotate-45 ${
                    destacado ? "bg-white/15" : "bg-gray-50 group-hover:bg-[#3B6FCA]/10"
                  }`}
                >
                  <ArrowUpRight className={`w-4 h-4 ${destacado ? "text-white" : "text-[#3B6FCA]"}`} />
                </div>
              </div>
              <h3 className={`font-semibold text-lg ${destacado ? "text-white" : "text-gray-800"}`}>{title}</h3>
              <p className={`mt-2.5 text-sm leading-relaxed ${destacado ? "text-white/80" : "text-gray-500"}`}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo agendar tu cita ── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Agendar tu cita toma menos de 2 minutos
            </h2>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Un proceso simple, en 3 pasos, para que reserves tu atención sin llamadas ni filas.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {pasosAgendar.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="relative text-center px-4">
                <div className="relative w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-6 h-6 text-[#3B6FCA]" />
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#3B6FCA] text-white text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-gray-800 mt-1">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 py-3.5 px-8 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
            >
              Crear cuenta y agendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Equipo médico ── */}
      {doctores.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Nuestro equipo médico
            </h2>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Profesionales certificados, listos para atenderte.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {doctores.map((d) => (
              <div
                key={d._id}
                className="text-center p-5 rounded-2xl border border-gray-100 hover:border-[#3B6FCA]/30 hover:shadow-lg hover:shadow-[#3B6FCA]/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-[#3B6FCA]/10 ring-4 ring-[#3B6FCA]/5 flex items-center justify-center overflow-hidden mb-3">
                  {d.img_url ? (
                    <img src={d.img_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-[#3B6FCA]" />
                  )}
                </div>
                <p className="font-semibold text-sm text-gray-800">Dr. {d.name} {d.last_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Nosotros / CTA ── */}
      <section id="nosotros" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Comprometidos con la salud de tu familia
            </h2>
            <p className="mt-5 text-gray-500 text-base leading-relaxed">
              Contamos con un equipo médico multidisciplinario y procesos
              digitales pensados para que agendar una cita, dar seguimiento a
              tu historial o contactar a tu doctor sea simple y sin fricciones.
            </p>

            <ul className="mt-7 space-y-3">
              {beneficios.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#3B6FCA]" />
                  </span>
                  <span className="text-sm text-gray-600">{b}</span>
                </li>
              ))}
              {doctores.length > 0 && (
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="w-3 h-3 text-[#3B6FCA]" />
                  </span>
                  <span className="text-sm text-gray-600">{doctores.length}+ doctores certificados a tu disposición</span>
                </li>
              )}
            </ul>

            <Link
              to="/register"
              className="inline-block mt-8 py-3.5 px-7 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
            >
              Regístrate como paciente
            </Link>
          </div>

          <div id="contacto" className="p-8 rounded-2xl bg-white border border-gray-100 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-[#3B6FCA] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-gray-800">Horario de atención</p>
                <p className="text-sm text-gray-500">Lunes a domingo - agenda tu cita ya</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-[#3B6FCA] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-gray-800">Ubicación</p>
                <p className="text-sm text-gray-500">San Salvador, El Salvador</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="max-w-3xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-4">
          {preguntasFrecuentes.map(({ pregunta, respuesta }, i) => {
            const abierta = faqAbierta === i;
            return (
              <div key={pregunta} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setFaqAbierta(abierta ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                >
                  <p className="font-semibold text-gray-800">{pregunta}</p>
                  <ChevronDown className={`w-5 h-5 text-[#3B6FCA] flex-shrink-0 transition-transform duration-200 ${abierta ? "rotate-180" : ""}`} />
                </button>
                {abierta && (
                  <p className="px-6 pb-6 text-sm text-gray-500 leading-relaxed">{respuesta}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E4BAD] to-[#0F2D6E] px-8 sm:px-12 py-12 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute right-10 bottom-0 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <HeartPulse className="hidden sm:block absolute right-10 top-1/2 -translate-y-1/2 w-32 h-32 text-white/10" strokeWidth={1} />

          <div className="relative text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ¿Listo para cuidar tu salud?
            </h2>
            <p className="mt-2 text-white/70 text-sm sm:text-base max-w-md">
              Crea tu cuenta de paciente y agenda tu primera cita en minutos.
            </p>
          </div>

          <Link
            to="/register"
            className="relative flex-shrink-0 flex items-center gap-2 py-3.5 px-8 rounded-xl bg-white hover:bg-gray-100 active:scale-[0.98] text-[#1E4BAD] font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg"
          >
            Crear cuenta y agendar <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-6 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span>Clínica Familia Monte Tabor</span>
        </div>
        <span>© {new Date().getFullYear()} Todos los derechos reservados.</span>
      </footer>
    </div>
  );
};

export default Home;