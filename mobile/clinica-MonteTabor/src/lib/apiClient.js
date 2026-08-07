import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config/api";

const TOKEN_KEY = "patient_token";

// SecureStore cifra con Keychain (iOS) y Keystore (Android). Todo es asíncrono
export const tokenStorage = {
    get: () => SecureStore.getItemAsync(TOKEN_KEY),
    set: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
    remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// El contexto registra aquí su cierre de sesión. Se usa callback y no import
// para evitar el ciclo apiClient -> AuthContext -> apiClient
let onUnauthorized = null;
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

async function apiClient(path, { method = "GET", body, params, signal, timeout = 15000 } = {}) {
    let url = `${API_URL}${path}`;

    if (params) {
        // Se descartan los valores vacíos para no mandar query params inútiles
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        if (queryString) url += `?${queryString}`;
    }

    // Reemplaza a la cookie de sesión de la versión web
    const token = await tokenStorage.get();

    const isFormData = body instanceof FormData;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // Con FormData se omite el Content-Type para que React Native genere el boundary
    if (body && !isFormData) headers["Content-Type"] = "application/json";

    // Sin timeout, una IP equivocada deja el fetch colgado indefinidamente
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    // Se encadena la señal externa (ej: cancelar al desmontar la pantalla)
    if (signal) signal.addEventListener("abort", () => controller.abort());

    let response;
    try {
        response = await fetch(url, {
            method,
            signal: controller.signal,
            headers,
            body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        });
    } catch (error) {
        if (timedOut) {
            throw new Error("El servidor no respondió. Verifica que la API esté corriendo y que el dispositivo esté en la misma red Wi-Fi.");
        }
        // Cancelación intencional: se propaga tal cual, no es un fallo de red
        if (controller.signal.aborted) throw error;
        // El error nativo de RN es "Network request failed", inservible para el usuario
        throw new Error("No se pudo conectar con el servidor.");
    } finally {
        clearTimeout(timeoutId);
    }

    // Se parsea siempre porque la API devuelve { message } también en los errores
    const data = await response.json().catch(() => null);

    // Token vencido o inválido: se limpia y se avisa al contexto
    if (response.status === 401 && token) {
        await tokenStorage.remove();
        onUnauthorized?.();
    }

    if (!response.ok) {
        const error = new Error(data?.message || `Error ${response.status}`);
        // Se expone el status para poder distinguir casos puntuales (ej. 403 = cuenta
        // desactivada) sin depender del texto exacto del mensaje.
        error.status = response.status;
        throw error;
    }

    return data;
}

export default apiClient;