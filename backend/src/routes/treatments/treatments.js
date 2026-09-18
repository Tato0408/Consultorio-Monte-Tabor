import express from "express";
import treatmentsController from "../../controllers/treatments/treatmentsController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import uploadDocument from "../../utils/CloudinaryDocumentConfig.js";

const router = express.Router();

// Todas las acciones usan el permiso inventory.treatments, con el mismo
// criterio del resto del sistema: view para leer, create para agregar
// algo nuevo, update para editar el plan o el estado, delete para borrar
// una nota o un documento.
router.get("/", authorize("inventory.treatments", "view"), treatmentsController.list);
router.get("/active", authorize("inventory.treatments", "view"), treatmentsController.getActiveByPatient);
router.get("/:id", authorize("inventory.treatments", "view"), treatmentsController.getById);

router.post("/", authorize("inventory.treatments", "create"), treatmentsController.create);
router.delete("/:id", authorize("inventory.treatments", "delete"), treatmentsController.remove);
router.patch("/:id", authorize("inventory.treatments", "update"), treatmentsController.updatePlan);
router.patch("/:id/control", authorize("inventory.treatments", "update"), treatmentsController.scheduleControl);
router.patch("/:id/status", authorize("inventory.treatments", "update"), treatmentsController.setStatus);

router.post("/:id/notes", authorize("inventory.treatments", "create"), treatmentsController.addNote);
router.patch("/:id/timeline/:entryId", authorize("inventory.treatments", "update"), treatmentsController.updateNote);
router.delete("/:id/timeline/:entryId", authorize("inventory.treatments", "delete"), treatmentsController.deleteNote);

// El archivo se sube a Cloudinary (multer) antes de llegar al controller,
// igual que las fotos de doctores, enfermeras y recepcionistas.
router.post(
  "/:id/documents",
  authorize("inventory.treatments", "create"),
  uploadDocument.single("document"),
  treatmentsController.uploadDocument
);
router.delete(
  "/:id/documents/:documentId",
  authorize("inventory.treatments", "delete"),
  treatmentsController.deleteDocument
);

export default router;
