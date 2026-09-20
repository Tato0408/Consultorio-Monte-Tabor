import { useState } from "react";
import apiClient from "@/lib/apiClient";

// Reemplaza a los 4 hooks por rol (useRecoveryAdmin/Doctor/Nurse/Receptionist): el
// backend ahora es un único endpoint que revisa las 4 colecciones de staff internamente
// y nunca revela si el correo existe (ver staffRecoveryController.js). El formulario de
// "Olvidé mi contraseña" ya no necesita saber ni recordar el rol.
export const useStaffRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestCode = async (email) => {
    try {
      setLoading(true);
      setError(null);
      return await apiClient("/staffRecovery/requestCode", {
        method: "POST",
        body: { email },
      });
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code) => {
    try {
      setLoading(true);
      setError(null);
      return await apiClient("/staffRecovery/verifyCode", {
        method: "POST",
        body: { code },
      });
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setLoading(true);
      setError(null);
      return await apiClient("/staffRecovery/resendCode", { method: "POST" });
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const newPassword = async (newPassword, confirmNewPassword) => {
    try {
      setLoading(true);
      setError(null);
      return await apiClient("/staffRecovery/newPassword", {
        method: "POST",
        body: { newPassword, confirmNewPassword },
      });
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, requestCode, verifyCode, resendCode, newPassword };
};
