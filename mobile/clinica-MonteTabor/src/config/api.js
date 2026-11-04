import Constants from "expo-constants";
import { Platform } from "react-native";

// El backend corre en local, en el puerto 4000 de la PC. Se puede sobreescribir con
// EXPO_PUBLIC_API_URL (ej. EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api).
const LOCAL_API_PORT = 4000;

function getBaseUrl() {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

    // En desarrollo, Expo sabe la IP de la PC que sirve la app (hostUri = "192.168.x.x:8081"),
    // que es la misma PC donde corre el backend. Así el teléfono lo encuentra en la red local.
    const hostUri = Constants.expoConfig?.hostUri;
    const host = hostUri?.split(":")[0];
    if (host) return `http://${host}:${LOCAL_API_PORT}/api`;

    // Sin hostUri: en el emulador de Android "localhost" es el propio emulador, la PC es 10.0.2.2
    const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
    return `http://${fallbackHost}:${LOCAL_API_PORT}/api`;
}

// Se resuelve una sola vez al importar el módulo
export const API_URL = getBaseUrl();

// URL del WebSocket de tiempo real (mismo canal /ws/roles que ya usan el panel privado
// y el portal público): mismo host que la API, con esquema ws y sin el sufijo "/api".
export const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "") + "/ws/roles";

// __DEV__ es false en producción, así que esta traza no llega al build final
if (__DEV__) console.log("[API] URL base:", API_URL);
