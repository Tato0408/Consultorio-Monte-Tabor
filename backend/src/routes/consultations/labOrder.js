import express from "express";
import labOrderController from "../../controllers/consultations/labOrder.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// La orden de laboratorio es parte del flujo de consulta, así que reusa el
// mismo módulo de permisos (calendar.consultations) en vez de uno propio.
router.route("/by-appointment/:appointmentId")
    .get(authorize("calendar.consultations", "view"), labOrderController.getByAppointment)
    .delete(authorize("calendar.consultations", "delete"), labOrderController.removeByAppointment);

router.route("/")
    .get(authorize("calendar.consultations", "view"), labOrderController.list)
    .post(authorize("calendar.consultations", "create"), labOrderController.upsert);

export default router;
