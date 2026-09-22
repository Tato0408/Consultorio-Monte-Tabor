import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import apiClient from "./apiClient";

// Controla cómo se muestra una notificación push si llega mientras la app está ABIERTA en
// primer plano — sin esto, expo-notifications no la muestra como banner en ese caso (solo
// en segundo plano/cerrada), y el paciente no vería nada hasta minimizar la app.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Pide permiso, obtiene el Expo Push Token del dispositivo y lo guarda contra la sesión del
// paciente en el backend (ver patientSelfController.updatePushToken). Se llama justo
// después de iniciar sesión o de recuperar una sesión guardada (ver AuthContext.jsx).
// Silencioso ante cualquier falla (permiso denegado, sin conexión, emulador sin Google Play
// Services, etc.): las notificaciones push son un extra, nunca deben bloquear el login.
export async function registerForPushNotifications() {
    try {
        // El canal por defecto es obligatorio en Android 8+ para que la notificación se
        // muestre con sonido/prioridad normal en vez de silenciada.
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.DEFAULT,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#3B6FCA",
            });
        }

        // Los emuladores/simuladores no tienen forma de recibir push reales.
        if (!Device.isDevice) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        if (!token) return;

        // silentAuth: si esto da 401 no debe cerrar la sesión del paciente completa, es solo
        // registrar el dispositivo para push, no la actividad principal del usuario.
        await apiClient("/patientAccount/me/push-token", {
            method: "PUT",
            body: { push_token: token },
            silentAuth: true,
        });
    } catch (error) {
        console.log("No se pudo registrar el dispositivo para notificaciones push:", error);
    }
}

// Se llama al cerrar sesión (antes de borrar el token de autenticación, para que esta
// petición todavía pueda autenticarse), así el backend deja de intentar empujar
// notificaciones a un dispositivo donde ya no hay sesión iniciada.
export async function clearPushToken() {
    try {
        await apiClient("/patientAccount/me/push-token", {
            method: "PUT",
            body: { push_token: null },
            silentAuth: true,
        });
    } catch {
        // Sin conexión al cerrar sesión no es crítico: el próximo login sobreescribe el
        // token de todas formas.
    }
}
