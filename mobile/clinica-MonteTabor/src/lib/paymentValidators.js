// Máscaras y validaciones del formulario de pago. Mismo criterio que la versión web
// (frontend/Clinica-monteTabor-publica/src/lib/paymentValidators.js): se limpian los
// caracteres no numéricos y se vuelve a armar el formato en cada tecla. La única
// diferencia es que aquí no hace falta recalcular la posición del cursor: los
// TextInput de React Native no pierden la posición al reemplazar el value como sí
// lo hacen los inputs nativos del navegador.

// Respeta el largo real de cada marca: Amex son 15 dígitos (formato 4-6-5),
// el resto (Visa, Mastercard, etc.) son 16 dígitos (formato 4-4-4-4)
export const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  const esAmex = /^3[47]/.test(digits);
  const limitado = digits.slice(0, esAmex ? 15 : 16);

  if (esAmex) {
    return limitado.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  }
  return limitado.replace(/(.{4})(?=.)/g, "$1 ");
};

export const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const formatCvv = (value) => value.replace(/\D/g, "").slice(0, 4);

// Máscara del nombre del titular: bloquea números y caracteres especiales mientras se
// escribe, deja solo letras (con acentos/ñ) y espacios. nombreValido (más abajo) valida
// además que haya nombre y apellido al enviar.
export const maskNombre = (value) => value.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, "");

// Detecta la marca de la tarjeta a partir de los primeros dígitos
export const detectarMarca = (numero) => {
  const n = numero.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return null;
};

// El largo real esperado según la marca detectada (15 para Amex, 16 para el resto)
export const longitudValida = (numero) => {
  const digits = numero.replace(/\D/g, "");
  const esAmex = /^3[47]/.test(digits);
  return digits.length === (esAmex ? 15 : 16);
};

// Algoritmo de Luhn: valida que el número de tarjeta tenga un formato matemáticamente válido
export const luhnValido = (numero) => {
  const digits = numero.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let suma = 0;
  let duplicar = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (duplicar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
};

// El CVV real tiene 4 dígitos solo en Amex; en el resto de marcas son 3
export const cvvValido = (cvv, numeroTarjeta) => {
  const esAmex = /^3[47]/.test(numeroTarjeta.replace(/\D/g, ""));
  return cvv.length === (esAmex ? 4 : 3);
};

// El nombre del titular: solo letras (con acentos/ñ) y espacios, al menos dos palabras
export const nombreValido = (nombre) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(\s[A-Za-zÁÉÍÓÚÑáéíóúñ]+)+$/.test(nombre.trim());

// Valida que "MM/AA" tenga un mes real y no esté ya vencida
export const expiryValida = (mmAA) => {
  const [mm, aa] = mmAA.split("/");
  if (!mm || !aa || mm.length !== 2 || aa.length !== 2) return false;
  const mes = Number(mm);
  if (mes < 1 || mes > 12) return false;

  const anioCompleto = 2000 + Number(aa);
  const finDeMes = new Date(anioCompleto, mes, 0, 23, 59, 59);
  return finDeMes >= new Date();
};
