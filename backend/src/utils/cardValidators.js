// Validación de los datos de tarjeta que llegan al backend antes de reenviarlos a Wompi.
// Mismo criterio que frontend/Clinica-monteTabor-publica/src/lib/paymentValidators.js:
// el frontend ya enmascara y valida, pero el servidor nunca debe confiar solo en eso —
// una petición hecha directo a la API (sin pasar por el formulario) se saltaría esas
// máscaras por completo.

// Detecta la marca a partir de los primeros dígitos, para saber el largo real
// esperado (Amex es distinto al resto).
const detectarMarca = (numero) => {
    if (/^3[47]/.test(numero)) return "Amex";
    if (/^4/.test(numero)) return "Visa";
    if (/^5[1-5]/.test(numero) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(numero)) return "Mastercard";
    return null;
};

// Algoritmo de Luhn: valida que el número de tarjeta tenga un formato
// matemáticamente válido (no que la tarjeta exista o tenga fondos, eso lo
// determina Wompi).
const luhnValido = (digits) => {
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

// Valida los datos de tarjeta usados para tokenizar (Tokenizacion de Wompi):
// numeroTarjeta, cvv, mesVencimiento, anioVencimiento. Devuelve un mensaje de
// error en español si algo no calza, o null si todo está bien.
export const validarDatosTarjeta = ({ numeroTarjeta, cvv, mesVencimiento, anioVencimiento }) => {
    const numero = String(numeroTarjeta || "").replace(/\D/g, "");
    if (!numero) return "El número de tarjeta es requerido.";
    if (!/^\d+$/.test(numero)) return "El número de tarjeta solo puede contener dígitos.";

    const marca = detectarMarca(numero);
    const largoEsperado = marca === "Amex" ? 15 : 16;
    if (numero.length !== largoEsperado) return "El número de tarjeta no tiene un largo válido.";
    if (!luhnValido(numero)) return "El número de tarjeta no es válido.";

    const cvvStr = String(cvv || "").trim();
    const largoCvvEsperado = marca === "Amex" ? 4 : 3;
    if (!/^\d+$/.test(cvvStr) || cvvStr.length !== largoCvvEsperado) {
        return `El CVV debe tener ${largoCvvEsperado} dígitos.`;
    }

    const mes = Number(mesVencimiento);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return "El mes de vencimiento no es válido.";

    const anio = Number(anioVencimiento);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return "El año de vencimiento no es válido.";

    // Último instante del mes de vencimiento: una tarjeta vence al final de ese mes, no al inicio.
    const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
    if (finDeMes < new Date()) return "La tarjeta ya está vencida.";

    return null;
};

// Valida los datos de la solicitud de cobro (TransaccionCompra): el monto, el
// nombre y el correo del titular. La tarjeta ya viene tokenizada en este
// punto (tokenTarjeta), así que aquí no se vuelve a validar el número.
export const validarDatosCobro = ({ monto, emailCliente, nombreCliente, tokenTarjeta }) => {
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) return "El monto a cobrar no es válido.";

    if (!tokenTarjeta || typeof tokenTarjeta !== "string") return "Falta el token de la tarjeta.";

    if (!nombreCliente || !nombreCliente.trim()) return "El nombre del titular es requerido.";
    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(\s[A-Za-zÁÉÍÓÚÑáéíóúñ]+)+$/.test(nombreCliente.trim())) {
        return "Ingresa el nombre y apellido del titular, solo letras.";
    }

    if (!emailCliente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente)) return "El correo del titular no es válido.";

    return null;
};
