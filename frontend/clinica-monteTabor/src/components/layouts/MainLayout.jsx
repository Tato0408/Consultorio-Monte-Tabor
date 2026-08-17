import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import SideBar from "./SideBar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../../context/AuthContext";


// Contenedor global y guardián de rutas para la sección interna del
// sistema. Maneja de forma responsiva la barra lateral (Sidebar) y
// restringe el acceso a usuarios no autenticados.
const MainLayout = () => {
    const { isLoggedIn, isLoading } = useAuth();
    // Controla la visibilidad de la barra lateral (Sidebar), únicamente en pantallas móviles.
    const [sideOpen, setSideOpen] = useState(false);

    // Mientras se verifica el token o la cookie de sesión, detiene el
    // renderizado para evitar destellos visuales.
    if (isLoading) return null;
    // Si la validación termina y el usuario no está autenticado, lo redirige al login.
    if (!isLoggedIn) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile backdrop */}
            {sideOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={() => setSideOpen(false)}
                />
            )}

            {/* Sidebar: fixed overlay on mobile, static on md+ */}
            <div
                className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
                    md:relative md:z-auto md:flex-shrink-0
                    ${sideOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
            >
                <SideBar onClose={() => setSideOpen(false)} />
            </div>

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Top bar: en móvil trae el botón de menú y el logo. La
                    campana de notificaciones se muestra en ambos tamaños. */}
                <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0 md:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSideOpen(true)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Abrir menú"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div
                            className="w-7 h-7 bg-[#0b66d6] text-white flex items-center justify-center font-bold text-sm"
                            style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
                        >
                            T
                        </div>
                        <span className="font-bold text-slate-800 text-sm">Monte Tabor</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
                    <Outlet />
                </main>
            </div>

            {/* sm:top-14 alinea verticalmente con el botón "Guardar cambios" de Horarios (ver
                nota de sm:mt-8 ahí). sm:right-12 equivale al padding derecho doble que separa
                ese botón del borde de la pantalla (sm:p-6 de <main> más sm:p-6 del contenedor
                de la página), para que la campana quede justo arriba de su borde derecho. Como
                esta campana es fixed y global (MainLayout), esa misma posición se mantiene
                igual en todas las interfaces del sistema. */}
            <div className="fixed top-4 sm:top-8 right-9 sm:right-14 z-30">
                <NotificationBell />
            </div>
        </div>
    );
};

export default MainLayout;
