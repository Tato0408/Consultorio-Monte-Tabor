import express from "express";
import scheduleController from "../../controllers/schedule/scheduleController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Bloqueo duro, independiente de la matriz de permisos en la base de
// datos. Recepción puede necesitar consultar horarios para agendar (por
// eso no se toca "view"), pero jamás debe poder modificarlos. Eso es
// exclusivo de cada doctor o enfermera sobre su propio horario, y del
// admin. Sin este guard, si alguien activa "update" en true para
// receptionist desde Roles y Permisos (o directamente en la base de
// datos), el PUT quedaría permitido igual.
const blockReceptionistScheduleWrite = (req, res, next) => {
    if (req.user?.role === "receptionist") {
        return res.status(403).json({ message: "Recepción no puede modificar horarios." });
    }
    next();
};

// Consulta pública autenticada para pacientes: slots donde al menos un doctor
// podría atender. No permite leer ni modificar horarios individuales.
router.get("/patient-available-slots", scheduleController.getPatientAvailableSlots);

router.route("/:doctorId/slots")
    .get(authorize("calendar.schedule", "view"), scheduleController.getAvailableSlots);

router.route("/:doctorId")
    .get(authorize("calendar.schedule", "view"), scheduleController.getSchedule)
    .put(blockReceptionistScheduleWrite, authorize("calendar.schedule", "update"), scheduleController.saveSchedule);

export default router;
