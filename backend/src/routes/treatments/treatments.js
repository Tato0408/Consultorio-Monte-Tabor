import express from "express";
import treatmentsController from "../../controllers/treatments/treatmentsController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import uploadDocument from "../../utils/CloudinaryDocumentConfig.js";

const router = express.Router();

router.get("/follow-up", authorize("inventory.treatments", "view"), treatmentsController.getFollowUp);

// Las 4 acciones del panel de seguimiento del paciente (botones "Actualizar evolución",
// "Agregar nota", "Programar control" y "Dar de alta") — mismo criterio de permisos que ya usa
// el resto del sistema: "create" para agregar algo nuevo, "update" para modificar el tratamiento.
router.patch("/:patientId/evolution",        authorize("inventory.treatments", "update"), treatmentsController.updateEvolution);
router.delete("/:patientId/evolution",       authorize("inventory.treatments", "delete"), treatmentsController.deleteEvolution);
router.post("/:patientId/notes",             authorize("inventory.treatments", "create"), treatmentsController.addNote);
router.patch("/:patientId/notes/:noteId",    authorize("inventory.treatments", "update"), treatmentsController.updateNote);
router.delete("/:patientId/notes/:noteId",   authorize("inventory.treatments", "delete"), treatmentsController.deleteNote);
router.patch("/:patientId/follow-up",        authorize("inventory.treatments", "update"), treatmentsController.scheduleControl);
router.patch("/:patientId/discharge",        authorize("inventory.treatments", "update"), treatmentsController.discharge);

// Botón "Subir documento" de la pestaña Documentos — sube el archivo a Cloudinary (multer) antes
// de llegar al controller, igual que las fotos de doctores/enfermeras/recepcionistas.
router.post("/:patientId/documents",              authorize("inventory.treatments", "create"), uploadDocument.single("document"), treatmentsController.uploadDocument);
router.delete("/:patientId/documents/:documentId", authorize("inventory.treatments", "delete"), treatmentsController.deleteDocument);

export default router;
