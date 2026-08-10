import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = 4000;
const PREFIX = "/api";

// Dentro del emulador de Android, 10.0.2.2 es el alias de la máquina anfitriona
const ANDROID_EMULATOR_HOST = "10.0.2.2";

function isLocalHost(host) {
    return !host || host === "localhost" || host === "127.0.0.1";
}

function getBaseUrl() {
    // Si existe la variable de entorno, se respeta y se omite la detección automática
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

    // Metro expone la dirección de la máquina donde corre ("192.168.1.15:8081")
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    let host = hostUri?.split(":")[0];

    // En emulador Metro reporta localhost, que ahí adentro no apunta a la PC
    if (isLocalHost(host)) {
        host = Platform.OS === "android" ? ANDROID_EMULATOR_HOST : "localhost";
    }

    return `http://${host}:${PORT}${PREFIX}`;
}

// Se resuelve una sola vez al importar el módulo
export const API_URL = getBaseUrl();

// __DEV__ es false en producción, así que esta traza no llega al build final
if (__DEV__) console.log("[API] URL base:", API_URL);