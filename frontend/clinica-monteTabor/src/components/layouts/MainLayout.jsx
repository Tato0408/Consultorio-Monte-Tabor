import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import SideBar from "./SideBar";
import { useAuth } from "../../context/AuthContext";

const MainLayout = () => {
    const { isLoggedIn, isLoading } = useAuth();
    const [sideOpen, setSideOpen] = useState(false);

    if (isLoading) return null;
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
                {/* Mobile top bar */}
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0 z-20">
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
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
