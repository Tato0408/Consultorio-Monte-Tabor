import express from "express";
import nurseScheduleController, { getPatientNursesForSlot } from "../../controllers/schedule/nurseScheduleController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Mismo criterio que /api/schedule/patient-doctors-for-slot: dado un horario ya elegido
// del agregado (patient-available-slots), qué enfermeras pueden atenderlo. Lo usa el
// registro rápido de citas (QuickAppointmentForm.jsx) cuando el procedimiento elegido no
// requiere doctor, para mostrar solo enfermeras realmente disponibles a esa fecha/hora.
router.get("/patient-nurses-for-slot", getPatientNursesForSlot);

// Mismo bloqueo duro que schedule.js: recepción nunca debe poder modificar horarios, sin
// importar lo que la matriz de permisos en la base de datos permita.
const blockReceptionistScheduleWrite = (req, res, next) => {
    if (req.user?.role === "receptionist") {
        return res.status(403).json({ message: "Recepción no puede modificar horarios." });
    }
    next();
};

// Mismo criterio que /api/schedule/:doctorId/slots: cualquier rol con permiso de ver
// horarios puede consultar los slots libres de una enfermera puntual (lo necesita el
// formulario de citas del panel privado cuando el procedimiento elegido no requiere
// doctor, ver AppointmentsFormCalendar.jsx), aunque no pueda ver/editar el horario crudo.
router.route("/:nurseId/slots")
    .get(authorize("calendar.schedule", "view"), nurseScheduleController.getAvailableSlotsForNurse);

router.route("/:nurseId")
    .get(authorize("calendar.schedule", "view"), nurseScheduleController.getSchedule)
    .put(blockReceptionistScheduleWrite, authorize("calendar.schedule", "update"), nurseScheduleController.saveSchedule);

export default router;
