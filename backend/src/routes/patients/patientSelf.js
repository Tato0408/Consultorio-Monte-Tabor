import express from "express";
import patientSelfController from "../../controllers/patients/patientSelfController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";

const router = express.Router();

// Pública: cualquiera puede registrarse.
router.post("/register", patientSelfController.register);

// Requiere sesión. El paciente se identifica por su token
// (req.user.id) y no por un :id en la URL, así que
// estructuralmente no hay forma de pedir o editar el perfil de
// otro paciente.
router.get("/me", authenticate, patientSelfController.getMe);
router.put("/me", authenticate, patientSelfController.updateMe);
router.put("/changePassword", authenticate, patientSelfController.changePassword);
router.get("/consultations", authenticate, patientSelfController.getMyConsultations);

// Historia clínica. Van en rutas propias y no dentro de PUT /me,
// porque updateMe solo maneja campos del documento raíz. Estos datos
// viven dentro de clinical_history y las listas se agregan con
// $push (sobrescribirlas con $set borraría los registros anteriores).
router.put("/me/blood-type", authenticate, patientSelfController.updateBloodType);
router.put("/me/lifestyle", authenticate, patientSelfController.updateLifestyle);

router.post("/me/hereditary", authenticate, patientSelfController.addHereditary);
router.delete("/me/hereditary/:entryId", authenticate, patientSelfController.deleteHereditary);

router.post("/me/pathological", authenticate, patientSelfController.addPathological);
router.delete("/me/pathological/:entryId", authenticate, patientSelfController.deletePathological);

export default router;
