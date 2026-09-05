import express from "express";
import prescriptionController from "../../controllers/consultations/prescription.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// La receta es un documento del expediente clínico: reusa el mismo módulo de
// permisos que incapacidades y órdenes de laboratorio (reports.records), no
// el de la consulta en curso (calendar.consultations).
router.route("/")
    .get(authorize("reports.records", "view"), prescriptionController.getPrescriptions);

router.route("/:id")
    .put(authorize("reports.records", "update"), prescriptionController.updatePrescription)
    .delete(authorize("reports.records", "delete"), prescriptionController.deletePrescription);

export default router;
