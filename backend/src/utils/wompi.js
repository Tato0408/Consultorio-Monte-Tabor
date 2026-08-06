import crypto from "crypto";
import { config } from "../../config.js";

const WOMPI_ID_URL = "https://id.wompi.sv/connect/token";
const WOMPI_API_URL = "https://api.wompi.sv";

// El token se cachea en memoria para no pedir uno nuevo en cada llamada;
// se renueva un minuto antes de que expire de verdad. Este token es solo para uso
// interno del servidor (verificar pagos); el que usa el formulario de pago del
// paciente lo pide aparte, vía wompiController.generarToken.
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

    const body = new URLSearchParams({
        grant_type: config.wompi.grantType,
        client_id: config.wompi.clientId,
        client_secret: config.wompi.clientSecret,
        audience: config.wompi.audience,
    });

    const response = await fetch(WOMPI_ID_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!response.ok) {
        throw new Error("No se pudo autenticar con Wompi");
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
}

// Vuelve a consultar una transacción directamente con Wompi usando nuestras propias
// credenciales (nunca confiando en lo que el frontend diga que pasó), para confirmar
// de verdad si el pago fue aprobado antes de marcar una cita como agendada.
export async function getTransactionStatus(idTransaccion) {
    const token = await getAccessToken();
    const response = await fetch(`${WOMPI_API_URL}/TransaccionCompra/${idTransaccion}`, {
        headers: { authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.message || data?.title || "No se pudo consultar la transacción");
    }
    return data; // incluye esAprobada (boolean)
}

// Verifica que un webhook realmente venga de Wompi: compara el HMAC-SHA256 del cuerpo
// crudo (usando el client secret como llave) contra el header "wompi_hash"
export function verifyWebhookSignature(rawBody, receivedHash) {
    if (!receivedHash || !rawBody) return false;
    const hmac = crypto.createHmac("sha256", config.wompi.clientSecret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    return expected === receivedHash;
}