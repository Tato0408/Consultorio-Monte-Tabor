import notificationModel from "../../models/notifications/notification.js";

const notificationsController = {};

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

        return res.status(200).json({ data: notifications, unreadCount });
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

export default notificationsController;
