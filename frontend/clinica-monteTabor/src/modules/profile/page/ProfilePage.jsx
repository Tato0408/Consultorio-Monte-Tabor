import React, { useRef } from "react";
import { ChevronRight, LogOut, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext"; // Ajusta la ruta según tu proyecto
import useProfile from '../hooks/useProfile'
import ChangePasswordModal from "../components/ChangePasswordModal";
import {useState} from 'react'
import { calculateAge } from "../../../lib/validators";


const ProfilePage = () => {
  const { user, userType, logout, isLoading: authLoading } = useAuth();
  const { submitting, uploadAvatar, deleteAvatar } = useProfile();
  const fileInputRef = useRef(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);


  const roleTranslations = {
    admin: "Administrador del sistema",
    doctor: "Médico Especialista",
    nurse: "Personal de Enfermería",
    receptionist: "Recepcionista del sistema",
  };

  // doctor y recepcionista tienen la foto como campo obligatorio en su modelo (siempre se sube
  // una al registrarlos) — a diferencia de admin/enfermería, eliminarla dejaría la cuenta en un
  // estado que el propio backend no permite crear, así que aquí no se ofrece esa opción.
  const canDeleteAvatar = userType === "admin" || userType === "nurse";

  const handleTriggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const success = await uploadAvatar(file);
    if (success) {
      e.target.value = null;
    }
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 bg-gray-50/50 min-h-screen">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span>Sistema</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-700 font-medium">Mi perfil</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi perfil</h1>
          <p className="text-sm text-gray-500 mt-1">
            Información personal, rol asignado y configuración de la cuenta.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all self-start md:self-center"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-start">

        {/* COLUMNA IZQUIERDA: Avatar */}
        <div className="lg:col-span-1 space-y-6">

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <h3 className="w-full text-left font-bold text-blue-900 text-xs uppercase tracking-wider mb-6">
              Información básica
            </h3>

            <div className="relative w-28 h-28 mb-4">
              {submitting ? (
                <div className="w-full h-full rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <img
                  src={user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                  alt="Avatar del usuario"
                  className="w-full h-full rounded-full object-cover border border-gray-100 shadow-inner"
                />
              )}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={handleTriggerFileInput}
                disabled={submitting}
                className="px-3 py-1.5 border border-gray-200 text-blue-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cambiar foto
              </button>
              {canDeleteAvatar && user.image && (
                <button
                  onClick={deleteAvatar}
                  disabled={submitting}
                  className="p-2 border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-sm font-bold text-gray-800 text-center">
              {roleTranslations[userType] || "Usuario del sistema"}
            </span>

            <div className="flex flex-col items-center gap-2 mt-4 w-full px-4">
              <span className={`w-full max-w-[140px] py-1 text-center text-xs font-semibold rounded-full ${user.is_active ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                {user.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
              Estado de la cuenta
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] font-medium text-gray-400 mb-1">Estado general</span>
                <span className={`inline-block px-3 py-0.5 text-xs font-semibold rounded-md ${user.is_active ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                  {user.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-400 mb-1">Verificación</span>
                <span className={`inline-block px-3 py-0.5 text-xs font-semibold rounded-md ${user.is_verified ? "text-blue-600 bg-blue-50" : "text-yellow-600 bg-yellow-50"}`}>
                  {user.is_verified ? "Verificado" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Datos personales */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-6">
              Datos personales
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Nombres</label>
                <p className="text-sm font-bold text-gray-800">{user.name || "—"}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Apellidos</label>
                <p className="text-sm font-bold text-gray-800">{user.last_name || "—"}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">DUI</label>
                <p className="text-sm font-bold text-gray-800">{user.dui || "—"}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Edad</label>
                <p className="text-sm font-bold text-gray-800">
                  {user.birth_date && calculateAge(user.birth_date) !== null
                    ? `${calculateAge(user.birth_date)} años`
                    : "—"}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Género</label>
                <p className="text-sm font-bold text-gray-800">{user.gender || "—"}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Correo electrónico</label>
                <p className="text-sm font-bold text-gray-800">{user.email || "—"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
              Seguridad
            </h3>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-900">Cambiar contraseña</h4>
              <p className="text-xs text-gray-500">Actualiza tu contraseña de ingreso al sistema en cualquier momento.</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2.5 border border-blue-600 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Modificar contraseña
              </button>
            </div>
          </div>

        </div>
      </div>
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>

  );
};

export default ProfilePage;