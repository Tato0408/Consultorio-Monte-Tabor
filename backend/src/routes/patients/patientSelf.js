import express from "express";
import patientSelfController from "../../controllers/patients/patientSelfController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { requireActiveUser } from "../../middlewares/requireActiveUser.js";

const router = express.Router();

// Pública: cualquiera puede registrarse.
router.post("/register", patientSelfController.register);

// De aquí en adelante toda ruta exige sesión y que la cuenta del paciente
// siga activa. Un paciente desactivado en medio de una sesión recibe 401 y
// el cliente cierra la sesión, sin depender de que su token venza. El
// paciente se identifica por su token (req.user.id) y no por un :id en la
// URL, así que estructuralmente no hay forma de pedir ni editar el perfil de
// otro paciente.
router.use(authenticate(), requireActiveUser);

router.get("/me", patientSelfController.getMe);
router.put("/me", patientSelfController.updateMe);
router.put("/changePassword", patientSelfController.changePassword);
router.get("/consultations", patientSelfController.getMyConsultations);
router.get("/consultations/:consultationId", patientSelfController.getMyConsultationById);

// Historia clínica. Van en rutas propias y no dentro de PUT /me,
// porque updateMe solo maneja campos del documento raíz. Estos datos
// viven dentro de clinical_history y las listas se agregan con
// $push (sobrescribirlas con $set borraría los registros anteriores).
router.put("/me/blood-type", patientSelfController.updateBloodType);
router.put("/me/lifestyle", patientSelfController.updateLifestyle);

router.post("/me/hereditary", patientSelfController.addHereditary);
router.delete("/me/hereditary/:entryId", patientSelfController.deleteHereditary);

router.post("/me/pathological", patientSelfController.addPathological);
router.delete("/me/pathological/:entryId", patientSelfController.deletePathological);

export default router;
