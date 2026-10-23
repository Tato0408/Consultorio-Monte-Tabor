import { Link } from "react-router-dom";
import { Home, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Ilustración de la lupa con carita triste y nubes decorativas,
// dibujada a mano en SVG para no depender de un asset externo.
const SearchIllustration = () => (
  <svg viewBox="0 0 220 170" className="w-48 h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sombra */}
    <ellipse cx="98" cy="156" rx="55" ry="7" fill="#E7ECF7" />

    {/* Nubes decorativas */}
    <g fill="#EEF1FA">
      <circle cx="28" cy="34" r="10" />
      <circle cx="42" cy="27" r="14" />
      <circle cx="57" cy="34" r="10" />
      <rect x="26" y="30" width="34" height="14" rx="7" />
    </g>
    <g fill="#EEF1FA">
      <circle cx="172" cy="46" r="8" />
      <circle cx="183" cy="41" r="11" />
      <circle cx="195" cy="46" r="8" />
      <rect x="170" y="43" width="27" height="11" rx="5.5" />
    </g>

    {/* Puntos decorativos */}
    <circle cx="20" cy="98" r="3.5" fill="#DCE3F5" />
    <circle cx="200" cy="90" r="4" fill="#DCE3F5" />
    <circle cx="45" cy="140" r="3" fill="#DCE3F5" />
    <circle cx="188" cy="130" r="3" fill="#DCE3F5" />

    {/* Mango de la lupa */}
    <line
      x1="123" y1="103" x2="153" y2="133"
      stroke="#3B6FCA" strokeWidth="15" strokeLinecap="round"
    />

    {/* Lente de la lupa */}
    <circle cx="97" cy="78" r="38" fill="#FFFFFF" stroke="#3B6FCA" strokeWidth="9" />

    {/* Carita triste */}
    <circle cx="84" cy="71" r="3.6" fill="#1F2937" />
    <circle cx="110" cy="71" r="3.6" fill="#1F2937" />
    <path
      d="M84 93 Q97 82 110 93"
      stroke="#1F2937" strokeWidth="3.2" strokeLinecap="round" fill="none"
    />
  </svg>
);

const NotFound = () => {
  const { hasAdmins, isLoggedIn, isLoading } = useAuth();
  // authCookie se crea con httpOnly (ver loginController.js), así que
  // JavaScript nunca puede leerla desde document.cookie. isLoggedIn sí
  // sirve: lo fija checkSession en AuthContext.jsx a partir de una
  // consulta real al backend (GET /auth/me), que valida esa cookie del
  // lado del servidor. Mientras esa consulta no termine (isLoading),
  // no se muestra el link, para no parpadear con el estado equivocado.
  const showPanelLink = !isLoading && isLoggedIn;

  // Si todavía no existe ningún administrador, la ruta /login rebota
  // automáticamente a /register (ver App.jsx). Por eso aquí se apunta
  // directo ahí y se cambia la etiqueta del botón, para que no diga
  // inicio de sesión cuando en realidad no hay ninguna cuenta creada
  // todavía.
  const primaryTo = hasAdmins ? "/login" : "/register";
  const primaryLabel = hasAdmins ? "Volver al inicio de sesión" : "Volver al primer registro";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F7F8FC] flex flex-col">
      {/* Manchas decorativas de fondo, mismos tonos de azul que el resto de la app */}
      <div
        className="absolute -top-28 -left-28 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #5B8FE0 0%, #4A7FD4 45%, #2D5BB5 80%, #1E4BAD 100%)",
        }}
      />
      <div className="absolute top-44 -left-14 w-24 h-24 rounded-full bg-[#A9C7F7] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#4A7FD4] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <div className="mb-6 flex items-center justify-center" style={{ width: "44px", height: "50px" }}>
            <img
              src="/logoConsultorioSInFondo.png"
              alt="Consultorio Médico Familiar Monte Tabor"
              className="w-full h-full object-contain"
              style={{ filter: "drop-shadow(0 4px 12px rgba(59,111,202,0.35))" }}
            />
          </div>

          <h1 className="text-7xl font-extrabold text-[#3B6FCA] tracking-tight leading-none mb-4">
            404
          </h1>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Página no encontrada</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-[280px]">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>

          <Link
            to={primaryTo}
            className="inline-flex items-center gap-2 bg-[#3B6FCA] hover:bg-[#2d5ab5] active:scale-[0.98] text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-[#3B6FCA]/25 transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            {primaryLabel}
          </Link>

          {/* El enlace de volver al panel solo se muestra si el backend
              confirmó una sesión activa. Si no hay sesión, no aparece. */}
          {showPanelLink && (
            <Link
              to="/home"
              className="mt-4 text-sm font-semibold text-[#3B6FCA] hover:underline transition-colors"
            >
              Volver al panel principal
            </Link>
          )}

          <div className="mt-8">
            <SearchIllustration />
          </div>
        </div>
      </div>

      {/* Footer sin línea divisoria, igual que en la imagen de referencia (a diferencia del
          FooterLogin compartido, que sí lleva un borde superior pensado para ir bajo un form) */}
      <div className="relative z-10 w-full max-w-md mx-auto px-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Todos tus datos están protegidos</span>
        </div>
        <span className="text-xs font-medium text-[#3B6FCA] hover:underline cursor-pointer">
          Consultorio Médico Familiar Monte Tabor
        </span>
      </div>
    </div>
  );
};

export default NotFound;
