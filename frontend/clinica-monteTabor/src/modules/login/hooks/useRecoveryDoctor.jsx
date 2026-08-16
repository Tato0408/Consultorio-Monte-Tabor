import { useState } from "react";
import apiClient from "@/lib/apiClient";

export const useRecoveryDoctor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Solicita el envío del código de recuperación al correo indicado.
  const requestCode = async (email) => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/recoveryDoctor/requestCode", {
        method: "POST",
        body: { email },
      });

      return data;
    } catch (error) {
      console.error("Error enviando código:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Verifica el código de recuperación ingresado por el usuario.
  const verifyCode = async (code) => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/recoveryDoctor/verifyCode", {
        method: "POST",
        body: { code },
      });

      return data;
    } catch (error) {
      console.error("Error verificando código:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reenvía el código de recuperación al mismo correo de la solicitud.
  const resendCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/recoveryDoctor/resendCode", {
        method: "POST",
      });

      return data;
    } catch (error) {
      console.error("Error reenviando código:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Envía la nueva contraseña junto con su confirmación para
  // completar el cambio de contraseña.
  const newPassword = async (newPassword, confirmNewPassword) => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient("/recoveryDoctor/newPassword", {
        method: "POST",
        body: { newPassword, confirmNewPassword },
      });

      return data;
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
    };

  return {
    loading,
    error,
    requestCode,
    verifyCode,
    newPassword,
    resendCode
  };
};