import { Link } from "react-router-dom";
import { CalendarCheck, ShieldCheck, Stethoscope, HeartPulse, Clock, MapPin } from "lucide-react";

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
    icon: HeartPulse,
    title: "Seguimiento clínico",
    description: "Historial médico digital para llevar el control de tus signos vitales y tratamientos.",
  },
  {
    icon: CalendarCheck,
    title: "Citas en línea",
    description: "Agenda, reprograma y consulta tus citas médicas desde cualquier lugar, en cualquier momento.",
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-bold text-gray-800 tracking-tight leading-tight">
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
            className="py-2.5 px-5 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── Hero (Centrado y Sin Imagen) ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute rounded-full -z-10"
          style={{
            width: "70%", paddingBottom: "70%", top: "-30%", left: "15%",
            background: "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
            opacity: 0.1,
          }}
        />
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-20 sm:py-32 flex flex-col items-center text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-[#3B6FCA]/10 text-[#3B6FCA] text-xs font-semibold tracking-wide mb-6">
            Salud para toda tu familia
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-gray-900">
            Cuidamos de ti,
            <br />
            <span className="text-[#3B6FCA]">en cada etapa de tu vida</span>
          </h1>
          <p className="mt-6 text-gray-500 text-lg leading-relaxed max-w-2xl">
            En Clínica Familia Monte Tabor combinamos atención médica cercana
            con tecnología moderna para que gestionar tu salud sea simple,
            rápido y seguro.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="py-3.5 px-8 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="py-3.5 px-8 rounded-lg border border-gray-200 hover:border-[#3B6FCA] text-gray-700 hover:text-[#3B6FCA] font-semibold text-sm tracking-wide transition-all duration-200"
            >
              Crear una cuenta
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-2.5 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
            <ShieldCheck className="w-5 h-5 text-[#3B6FCA]" />
            <span>Tus datos médicos siempre protegidos con encriptación avanzada</span>
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
          {services.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-7 rounded-2xl border border-gray-100 hover:border-[#3B6FCA]/30 hover:shadow-xl hover:shadow-[#3B6FCA]/5 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-[#3B6FCA]" />
              </div>
              <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
              <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

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
            <Link
              to="/register"
              className="inline-block mt-8 py-3.5 px-7 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#3B6FCA]/25"
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