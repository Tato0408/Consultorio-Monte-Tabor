import patientsModel from "../models/patients/patients.js";

// Notificación push real (aparece en el sistema operativo del teléfono, con la app cerrada
// o en segundo plano), vía la API pública de Expo — no hace falta ninguna credencial propia
// de Firebase/Apple, Expo se encarga de reenviarla. Solo aplica a pacientes: la app móvil es
// exclusiva de ellos, y son quienes registran un push_token al iniciar sesión (ver
// patientSelfController.updatePushToken). Se engancha una sola vez en el modelo Notification
// (ver post-save/post-insertMany en models/notifications/notification.js), así que cualquier
// notificación que ya se cree hoy (aceptación de cita, resultado de laboratorio, etc.) llega
// también como push sin tener que tocar cada punto donde se crea una.
export async function sendExpoPushForNotification(notification) {
    if (notification?.recipient_role !== "patient" || !notification?.recipient_id) return;

    try {
        const patient = await patientsModel
            .findById(notification.recipient_id)
            .select("push_token")
            .lean();
        const token = patient?.push_token;
        if (!token) return;

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
            body: JSON.stringify({
                to: token,
                title: notification.title || "Notificación",
                body: notification.message,
                sound: "default",
                data: {
                    notification_id: String(notification._id),
                    action_url: notification.action_url || null,
                },
            }),
        });

        const data = await response.json().catch(() => null);
        // "DeviceNotRegistered": el paciente desinstaló la app o cambió de dispositivo sin
        // volver a iniciar sesión — se limpia el token para no seguir intentando en vano.
        const pushError = data?.data?.details?.error || data?.data?.[0]?.details?.error;
        if (pushError === "DeviceNotRegistered") {
            await patientsModel.findByIdAndUpdate(notification.recipient_id, { push_token: null });
        }
    } catch (error) {
        console.log("Error enviando notificación push:", error);
    }
}

export default sendExpoPushForNotification;
