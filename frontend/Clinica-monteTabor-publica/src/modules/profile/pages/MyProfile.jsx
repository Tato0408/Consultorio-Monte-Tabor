import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, ChevronDown, Loader2, User, IdCard, CalendarDays,
  Phone, Mail, FileText, Activity, Droplet, Lock, LogOut,
  Pencil, Pill, AlertCircle, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMyProfile } from "@/services/profileService";
import { showError } from "@/lib/alerts";
import NotificationsMenu from "@/components/NotificationsMenu";
import EditProfileForm from "../components/EditProfileForm";
import ChangePasswordForm from "../components/ChangePasswordForm";
import HealthHistory from "../components/HealthHistory";
import BloodTypeSection from "../components/BloodTypeSection";

const EMPTY = "Sin registrar";

const fmtFechaLarga = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : EMPTY;

const fmtFechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;

// Edad en UTC: un nacimiento guardado a medianoche se leería un día antes en El Salvador (UTC-6).
const calcEdad = (iso) => {
  if (!iso) return null;
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - b.getUTCFullYear();
  const m = hoy.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < b.getUTCDate())) edad -= 1;
  return edad >= 0 ? edad : null;
};

const iniciales = (name, last) =>
  `${name?.trim()?.[0] || ""}${last?.trim()?.[0] || ""}`.toUpperCase() || "?";

// "Editar perfil" no va aquí: se abre con el botón dentro de la tarjeta de perfil.
const NAV = [
  { key: "resumen", label: "Resumen", icon: User },
  { key: "salud", label: "Historia clínica", icon: Activity },
  { key: "sangre", label: "Tipo de sangre", icon: Droplet },
  { key: "password", label: "Cambiar contraseña", icon: Lock },
];

const Row = ({ icon: Icon, label, value, right, onClick, to, danger }) => {
  const inner = (
    <>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-50 text-red-500" : "bg-[#EEF3FF] text-[#3B6FCA]"}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-semibold ${danger ? "text-red-600" : "text-gray-900"}`}>{label}</p>
        {value && <p className="text-xs text-gray-500 mt-0.5 truncate">{value}</p>}
      </div>
      {right && <span className="text-sm text-gray-600 font-medium text-right truncate max-w-[45%] flex-shrink-0">{right}</span>}
      {(onClick || to) && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    </>
  );
  const cls = "w-full flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-b-0";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
};

const MyProfile = () => {
  const navigate = useNavigate();
  const { patient: authPatient, logout, refetchSession } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [vista, setVista] = useState("resumen");
  const [menuOpen, setMenuOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await getMyProfile();
      setPatient(data || null);
    } catch (err) {
      setLoadError(true);
      showError(err.message || "No se pudo cargar tu perfil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Tras editar datos, refresca también la sesión para que el nombre del encabezado
  // se actualice en todo el portal.
  const recargar = useCallback(async () => {
    await cargar();
    refetchSession?.();
  }, [cargar, refetchSession]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const edad = calcEdad(patient?.birth_date);
  const meta = [edad !== null ? `${edad} años` : null, patient?.gender].filter(Boolean).join(" · ");
  const bloodType = patient?.clinical_history?.blood_type;

  const ultimosVitales = useMemo(() => {
    const signs = patient?.clinical_history?.vital_signs;
    if (!signs?.length) return null;
    // No se usa Array.prototype.at(-1): no existe en Safari < 15.4 (iPhones viejos).
    const ordenados = [...signs].sort((a, b) => new Date(a.last_date_taken || 0) - new Date(b.last_date_taken || 0));
    return ordenados[ordenados.length - 1];
  }, [patient]);

  const irA = (key) => { setVista(key); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="font-bold text-gray-800">Mi perfil</span>
          <div className="relative flex items-center gap-1">
            <NotificationsMenu />
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-semibold text-sm flex-shrink-0">
                {authPatient?.name?.[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{authPatient?.name} {authPatient?.last_name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-gray-500 text-sm mt-1">Tus datos personales, tu historia clínica y la seguridad de tu cuenta.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando tu perfil...
          </div>
        ) : loadError && !patient ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500 mb-4">No se pudo cargar tu perfil.</p>
            <button onClick={cargar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── Riel ── */}
            <aside className="lg:w-80 lg:flex-shrink-0 flex flex-col gap-4">
              <div className="rounded-2xl p-5 bg-[#3B6FCA] text-white">
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] flex-shrink-0 rounded-full border-2 border-white/55 bg-white/15 flex items-center justify-center text-xl font-bold">
                    {iniciales(patient?.name, patient?.last_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold leading-tight">{patient?.name} {patient?.last_name}</p>
                    {meta && <p className="text-xs text-white/80 mt-1">{meta}</p>}
                    {patient?.email && <p className="text-xs text-white/80 mt-0.5 truncate">{patient.email}</p>}
                  </div>
                </div>
                {bloodType && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                      <Droplet className="w-3 h-3 fill-white" /> {bloodType}
                    </span>
                  </div>
                )}
                <button onClick={() => irA("datos")} className="mt-4 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/25 rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  Editar perfil <Pencil className="w-4 h-4" />
                </button>
              </div>

              <nav className="bg-white border border-gray-100 rounded-2xl p-2 flex lg:flex-col gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {NAV.map(({ key, label, icon: Icon }) => {
                  // "datos" (Editar perfil) siempre se entra desde Resumen (botón del
                  // encabezado, accesos rápidos o cualquier fila de "Información
                  // personal") y no tiene su propio ítem en NAV a propósito. Sin este
                  // caso, ningún botón del riel quedaba marcado como activo al editar.
                  const active = vista === key || (key === "resumen" && vista === "datos");
                  return (
                    <button
                      key={key}
                      onClick={() => irA(key)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                        active ? "bg-[#3B6FCA] text-white" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" /> {label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* ── Contenido ── */}
            <main className="flex-1 min-w-0">
              {vista === "resumen" && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Accesos rápidos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <button onClick={() => irA("datos")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 transition-colors">
                      <User className="w-5 h-5 text-[#3B6FCA]" /><span className="text-xs text-gray-500">Mis datos</span>
                    </button>
                    <Link to="/mis-citas" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 transition-colors">
                      <CalendarDays className="w-5 h-5 text-[#3B6FCA]" /><span className="text-xs text-gray-500">Mis consultas</span>
                    </Link>
                    <Link to="/medicamentos" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 transition-colors">
                      <Pill className="w-5 h-5 text-[#3B6FCA]" /><span className="text-xs text-gray-500">Medicamentos</span>
                    </Link>
                    <button onClick={() => irA("sangre")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 transition-colors">
                      <Droplet className="w-5 h-5 text-red-500" /><span className="text-xs text-gray-500">Tipo de sangre</span>
                    </button>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-4">
                    <p className="text-base font-bold text-gray-900 mb-3">Información personal</p>
                    <Row icon={CalendarDays} label="Fecha de nacimiento" value={fmtFechaLarga(patient?.birth_date)} onClick={() => irA("datos")} />
                    <Row icon={IdCard} label="DUI" value={patient?.dui || EMPTY} onClick={() => irA("datos")} />
                    <Row icon={User} label="Género" value={patient?.gender || EMPTY} onClick={() => irA("datos")} />
                    <Row icon={Phone} label="Teléfono" value={patient?.phone || EMPTY} onClick={() => irA("datos")} />
                    <Row icon={Mail} label="Correo electrónico" value={patient?.email || EMPTY} onClick={() => irA("datos")} />
                    <Row icon={FileText} label="Mis documentos" value="Recetas, incapacidades y referencias" to="/documentos" />
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-4">
                    <p className="text-base font-bold text-gray-900 mb-3">Resumen de salud</p>
                    <Row label="Tipo de sangre" right={bloodType || EMPTY} onClick={() => irA("sangre")} />
                    <Row
                      label="Enfermedades crónicas"
                      right={patient?.clinical_history?.pathological?.length ? patient.clinical_history.pathological.map((p) => p.disease).join(", ") : EMPTY}
                      onClick={() => irA("salud")}
                    />
                    <Row
                      label="Antecedentes hereditarios"
                      right={patient?.clinical_history?.hereditary?.length ? `${patient.clinical_history.hereditary.length} registrado(s)` : EMPTY}
                      onClick={() => irA("salud")}
                    />
                    <Row label="Hábitos y entorno" right={patient?.clinical_history?.non_pathological ? "Registrado" : EMPTY} onClick={() => irA("salud")} />
                    <div className="text-center pt-3">
                      <button onClick={() => irA("salud")} className="text-sm font-semibold text-[#3B6FCA] hover:underline">Ver información completa</button>
                    </div>
                  </div>

                  {/* "Cambiar contraseña" y "Cerrar sesión" ya no van aquí: la primera está
                      en el riel de navegación y la segunda en el menú del encabezado. */}
                  {ultimosVitales && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-4">
                      <p className="text-base font-bold text-gray-900">Últimos signos vitales</p>
                      <p className="text-[11px] text-gray-400 mt-1 mb-2">
                        {fmtFechaCorta(ultimosVitales.last_date_taken) ? `Tomados el ${fmtFechaCorta(ultimosVitales.last_date_taken)} · ` : ""}
                        los registra el personal de la clínica
                      </p>
                      <Row label="Presión arterial" right={ultimosVitales.blood_pressure || EMPTY} />
                      <Row label="Glucosa" right={ultimosVitales.glucosa_mgdl ? `${ultimosVitales.glucosa_mgdl} mg/dL` : EMPTY} />
                      <Row label="Peso" right={ultimosVitales.weight ? `${ultimosVitales.weight} kg` : EMPTY} />
                      <Row label="IMC" right={ultimosVitales.imc ? String(ultimosVitales.imc) : EMPTY} />
                    </div>
                  )}

                </div>
              )}

              {vista === "datos" && (
                <>
                  <button onClick={() => irA("resumen")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
                    <ChevronLeft className="w-4 h-4" /> Volver a mi perfil
                  </button>
                  <EditProfileForm
                    patient={patient}
                    onSaved={async (updated) => { if (updated) setPatient(updated); await recargar(); irA("resumen"); }}
                    onCancel={() => irA("resumen")}
                  />
                </>
              )}

              {vista === "password" && (
                <>
                  <button onClick={() => irA("resumen")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
                    <ChevronLeft className="w-4 h-4" /> Volver a mi perfil
                  </button>
                  <ChangePasswordForm onDone={() => irA("resumen")} />
                </>
              )}

              {vista === "salud" && (
                <>
                  <button onClick={() => irA("resumen")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
                    <ChevronLeft className="w-4 h-4" /> Volver a mi perfil
                  </button>
                  <HealthHistory patient={patient} onChanged={recargar} onGoBloodType={() => irA("sangre")} />
                </>
              )}

              {vista === "sangre" && (
                <>
                  <button onClick={() => irA("resumen")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
                    <ChevronLeft className="w-4 h-4" /> Volver a mi perfil
                  </button>
                  <BloodTypeSection patient={patient} onSaved={async (updated) => { if (updated) setPatient(updated); await recargar(); }} />
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfile;
