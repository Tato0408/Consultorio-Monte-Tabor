import express from "express";
import patientSelfController from "../../controllers/patients/patientSelfController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";

const router = express.Router();

// Público — cualquiera puede registrarse
router.post("/register", patientSelfController.register);

// Requiere sesión — el paciente se identifica por su token (req.user.id), no por :id en la
// URL, así que estructuralmente no hay forma de pedir/editar el perfil de otro paciente
router.get("/me", authenticate, patientSelfController.getMe);
router.put("/me", authenticate, patientSelfController.updateMe);

export default router;
