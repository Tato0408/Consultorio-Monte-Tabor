import express from "express";
import notificationsController from "../../controllers/notifications/notificationsController.js";

const router = express.Router();

// Solo requieren estar autenticado (sin authorize por moduleKey): son
// notificaciones personales, cualquier rol autenticado lee/marca las suyas.
router.get("/me", notificationsController.getMyNotifications);
router.patch("/read-all", notificationsController.markAllAsRead);
router.patch("/:id/read", notificationsController.markAsRead);
router.delete("/all", notificationsController.deleteAllNotifications);
router.delete("/:id", notificationsController.deleteNotification);

export default router;
