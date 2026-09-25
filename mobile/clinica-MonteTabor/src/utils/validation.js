// Reglas de validación del lado del cliente — MISMOS regex y MISMAS reglas que
// backend/src/utils/validators.js, para que nunca queden desincronizados.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{4}-\d{4}$/;
export const DUI_REGEX = /^\d{8}-\d{1}$/;
// Solo letras (con acentos/ñ) y un espacio simple entre palabras: nada de números ni
// caracteres especiales. Mismo patrón que ya usaba paymentValidators.js para el nombre
// del titular de la tarjeta.
export const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(\s[A-Za-zÁÉÍÓÚÑáéíóúñ]+)*$/;

// "DD/MM/YYYY" (formato que produce FormDateInput/formatDate) -> "YYYY-MM-DD" (lo que espera
// el backend para castear a Date). Es una simple reordenada de texto, no pasa por Date en
// ningún momento, así que no hay riesgo de corrimiento de zona horaria.
export const toISODate = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  const [d, m, y] = ddmmyyyy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
};

// Máscara de teléfono: solo dígitos, formato XXXX-XXXX con guión automático
export const maskPhone = (text) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};

// Máscara de DUI: solo dígitos, formato XXXXXXXX-X con guión automático
export const maskDui = (text) => {
  const digits = text.replace(/\D/g, "").slice(0, 9);
  return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
};

// Máscara de nombre: bloquea números y caracteres especiales mientras se escribe, deja
// solo letras (con acentos/ñ) y espacios.
export const maskName = (text) => text.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, "");

// Misma regla que el checklist de contraseña de la web: más de 8 caracteres, mayúscula,
// minúscula, número y carácter especial. Devuelve el mensaje del primer requisito incumplido,
// o null si la contraseña cumple todos los requisitos.
export const getPasswordError = (password) => {
  if (!password || password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (!/[A-Z]/.test(password)) {
    return "Debe incluir al menos una mayúscula";
  }
  if (!/[a-z]/.test(password)) {
    return "Debe incluir al menos una minúscula";
  }
  if (!/[0-9]/.test(password)) {
    return "Debe incluir al menos un número";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Debe incluir al menos un carácter especial";
  }
  return null;
};
