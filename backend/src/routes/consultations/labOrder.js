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
    // El listado (GET) es lo que llena la pestaña Documentos > Laboratorio y el resumen del
    // expediente (usePatientRecordDetail.js), no la consulta en curso, así que reusa el
    // permiso del expediente clínico (reports.records) igual que el PUT/DELETE de abajo. Antes
    // usaba calendar.consultations: un rol con acceso a Expediente pero no a Consultas
    // recibía 403 en silencio y esa categoría de Documentos aparecía vacía sin aviso.
    .get(authorize("reports.records", "view"), labOrderController.list)
    .post(authorize("calendar.consultations", "create"), labOrderController.upsert);

// Edición/eliminación puntual de una orden ya finalizada desde la pestaña de
// Documentos del expediente: reusa el módulo de permisos del expediente
// clínico (reports.records), no el de la consulta en curso.
router.route("/:id")
    .put(authorize("reports.records", "update"), labOrderController.updateById)
    .delete(authorize("reports.records", "delete"), labOrderController.removeById);

export default router;
