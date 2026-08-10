import { useState } from "react";
import { API_URL } from "../../config/api";

const RECOVERY_URL = `${API_URL}/recoveryPatientPassword`;

// Espejo del patrón de recuperación de la web (useRecoveryDoctor.jsx, useRecoveryNurse.jsx, etc.),
// adaptado para móvil: ahí el token de recuperación viaja en una cookie que el navegador reenvía
// solo. Aquí no hay cookie jar, así que el backend además devuelve "recoveryToken" en el body de
// cada respuesta, y ese token se manda de vuelta explícito por header Authorization: Bearer.
// Como la app móvil solo maneja pacientes (no hay 4 roles como en la web), no hace falta el
// patrón de "probar cada hook de rol" de Recovery.jsx — se llama directo a un único endpoint.
export const useRecoveryPatient = () => {
  const [loading, setLoading] = useState(false);

  const request = async (path, body, recoveryToken) => {
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (recoveryToken) headers.Authorization = `Bearer ${recoveryToken}`;

      const response = await fetch(`${RECOVERY_URL}/${path}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}`);
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  // Paso 1: pide un código y lo envía al correo. Se reutiliza también para "Reenviar código"
  // (igual que hace VerifyCode.jsx en la web: ahí el reenvío llama de nuevo a requestCode).
  const requestCode = (email) => request("requestCode", { email });

  // Paso 2: verifica el código de 6 caracteres contra el token de la sesión de recuperación.
  const verifyCode = (code, recoveryToken) => request("verifyCode", { code }, recoveryToken);

  // Paso 3: establece la nueva contraseña. Requiere que el token ya esté marcado "verified".
  const newPassword = (password, confirmPassword, recoveryToken) =>
    request(
      "newPassword",
      { newPassword: password, confirmNewPassword: confirmPassword },
      recoveryToken
    );

  return { loading, requestCode, verifyCode, newPassword };
};

// Traducción de los mensajes que devuelve el backend de recuperación
export const RECOVERY_ERROR_MESSAGES = {
  "User not found": "No se encontró una cuenta con ese correo electrónico.",
  "Invalid code": "El código ingresado es incorrecto.",
  "Password doesnt match": "Las contraseñas no coinciden.",
  "Code not verified": "Debes verificar el código antes de continuar.",
  "Error sending mail": "No se pudo enviar el correo. Intenta de nuevo.",
  "Internal server error": "Error en el servidor. Intenta más tarde.",
  "No active recovery session found": "Tu sesión de recuperación expiró. Vuelve a empezar.",
  "Recovery session expired, please start again": "El código expiró. Vuelve a empezar el proceso.",
};

export default useRecoveryPatient;
