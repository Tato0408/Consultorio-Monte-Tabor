import notificationModel from "../../models/notifications/notification.js";

const notificationsController = {};

const inferLegacyTitle = (message = "") => {
    if (/acept/i.test(message)) return "Cita aceptada";
    if (/cancel/i.test(message)) return "Cita cancelada";
    if (/elimin/i.test(message)) return "Cita eliminada";
    if (/venci|expir/i.test(message)) return "Solicitud de cita vencida";
    if (/actualiz|edit/i.test(message)) return "Cita actualizada";
    if (/asign/i.test(message)) return "Nueva cita asignada";
    return "Notificación";
};

// Trae las notificaciones del usuario autenticado (por su propio rol + id).
notificationsController.getMyNotifications = async (req, res) => {
    try {
        const notifications = await notificationModel
            .find({ recipient_role: req.user.role, recipient_id: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await notificationModel.countDocuments({
            recipient_role: req.user.role,
            recipient_id: req.user.id,
            read: false,
        });

        // Las notificaciones antiguas no tienen título ni ruta. Se completan
        // al responder para conservar su utilidad sin migrar la colección.
        const data = notifications.map((document) => {
            const notification = document.toObject();
            const isDeleted = /elimin/i.test(notification.message || "");
            if (!notification.title) notification.title = inferLegacyTitle(notification.message);
            if (!notification.action_url && notification.appointment_id && !isDeleted) {
                // El portal público no tiene /appointments/:id/edit; la pantalla real
                // es /mis-citas (ver patientPortalController.js y notificationService.js).
                notification.action_url = req.user.role === "patient"
                    ? "/mis-citas"
                    : `/calendar/appointments/${notification.appointment_id}`;
            }
            return notification;
        });

        return res.status(200).json({ data, unreadCount });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Marca una notificación puntual como leída (solo si es del propio usuario).
notificationsController.markAsRead = async (req, res) => {
    try {
        const notification = await notificationModel.findOneAndUpdate(
            { _id: req.params.id, recipient_role: req.user.role, recipient_id: req.user.id },
            { $set: { read: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        return res.status(200).json(notification);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Marca todas las notificaciones del usuario autenticado como leídas.
notificationsController.markAllAsRead = async (req, res) => {
    try {
        await notificationModel.updateMany(
            { recipient_role: req.user.role, recipient_id: req.user.id, read: false },
            { $set: { read: true } }
        );

        return res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Elimina una notificación únicamente si pertenece al usuario autenticado.
notificationsController.deleteNotification = async (req, res) => {
    try {
        const notification = await notificationModel.findOneAndDelete({
            _id: req.params.id,
            recipient_role: req.user.role,
            recipient_id: req.user.id,
        });

        if (!notification) {
            return res.status(404).json({ message: "Notificación no encontrada" });
        }

        return res.status(200).json({ message: "Notificación eliminada", data: notification });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Vacía el historial de notificaciones del usuario autenticado.
notificationsController.deleteAllNotifications = async (req, res) => {
    try {
        await notificationModel.deleteMany({
            recipient_role: req.user.role,
            recipient_id: req.user.id,
        });

        return res.status(200).json({ message: "Notificaciones eliminadas" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default notificationsController;
