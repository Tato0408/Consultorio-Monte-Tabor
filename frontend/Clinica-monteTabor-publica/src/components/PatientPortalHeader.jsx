import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationsMenu from "@/components/NotificationsMenu";

// Encabezado compartido por las rutas independientes de citas. El dashboard
// conserva su propio encabezado, pero el grid y el formulario ya no lo pierden.
export default function PatientPortalHeader() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return <nav className="sticky top-0 z-40 mb-6 border-b border-slate-200 bg-white shadow-sm">
    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">T</span>
        <span className="hidden font-bold tracking-tight text-slate-800 sm:block">Portal Clínico</span>
      </Link>
      <div className="relative flex items-center gap-2">
        <NotificationsMenu />
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">U</span>
          <span className="hidden text-sm font-medium md:block">Mi Cuenta</span>
        </button>
        {open && <><button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" /><div className="absolute right-0 top-14 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><User className="h-4 w-4 text-slate-400" />Mi perfil</Link>
          <hr className="my-1 border-slate-100" />
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4 text-red-400" />Cerrar sesión</button>
        </div></>}
      </div>
    </div>
  </nav>;
}
