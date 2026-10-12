import { useState } from "react";
import apiClient from "@/lib/apiClient";

// Mismo patrón que useStaffRecovery.jsx del panel privado, apuntando al endpoint de
// recuperación de pacientes que ya existe en el backend (recoveryPasswordPatientController.js,
// montado en /api/recoveryPatientPassword) — ya lo usa la app móvil, solo faltaban estas
// pantallas en el portal público.
export const usePatientRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestCode = async (email) => {
    try {
      setLoading(true);
      setError(null);
      return await apiClient("/recoveryPatientPassword/requestCode", {
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
      return await apiClient("/recoveryPatientPassword/verifyCode", {
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
      return await apiClient("/recoveryPatientPassword/resendCode", { method: "POST" });
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
      return await apiClient("/recoveryPatientPassword/newPassword", {
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
