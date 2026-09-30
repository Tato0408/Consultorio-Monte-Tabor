import express from "express";
import authController from "../../controllers/auth/authController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";

const router = express.Router();

// Sin roles especificados: cualquier usuario autenticado (admin, doctor, nurse, receptionist)
router.route("/me")
    .get(authenticate(), authController.getCurrentUser);

// Boleto de vida corta para autenticar el WebSocket de tiempo real (ver getWsTicket):
// esta ruta sí pasa por el proxy de Vercel (mismo origen), así que la cookie de sesión
// llega confiable incluso en Chrome incógnito y Safari/iOS.
router.get("/ws-ticket", authenticate(), authController.getWsTicket);

export default router;