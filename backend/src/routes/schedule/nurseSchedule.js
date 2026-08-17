import express from "express";
import nurseScheduleController from "../../controllers/schedule/nurseScheduleController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Mismo bloqueo duro que schedule.js: recepción nunca debe poder modificar horarios, sin
// importar lo que la matriz de permisos en la base de datos permita.
const blockReceptionistScheduleWrite = (req, res, next) => {
    if (req.user?.role === "receptionist") {
        return res.status(403).json({ message: "Recepción no puede modificar horarios." });
    }
    next();
};

router.route("/:nurseId")
    .get(authorize("calendar.schedule", "view"), nurseScheduleController.getSchedule)
    .put(blockReceptionistScheduleWrite, authorize("calendar.schedule", "update"), nurseScheduleController.saveSchedule);

export default router;
