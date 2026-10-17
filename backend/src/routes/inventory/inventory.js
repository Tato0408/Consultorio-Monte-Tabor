import express from "express";
import upload from "../../utils/CloudinaryConfig.js";
import inventoryController from "../../controllers/inventory/inventoryController.js";
import { authorize, authorizeAny } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Stats, movimientos y gráficas (antes de /:id para evitar conflictos)
router.get("/stats",     authorize("inventory.reports", "view"), inventoryController.getStats);
router.get("/movements", authorize("inventory.movements", "view"), inventoryController.getMovements);
router.get("/charts",    authorize("inventory.reports", "view"), inventoryController.getCharts);

// Catálogo de insumos para el selector de materiales de una consulta. Solo
// lectura y con los datos mínimos (nombre, stock, unidad y vencimiento), así
// que alcanza con ver Consultas: atender una consulta no exige tener acceso
// al módulo de inventario completo.
router.get(
  "/consultation-catalog",
  authorizeAny(["inventory.products", "view"], ["calendar.consultations", "view"]),
  inventoryController.getConsultationCatalog
);

// CRUD principal
router.route("/")
  .get(authorize("inventory.products", "view"), inventoryController.getAll)
  .post(authorize("inventory.products", "create"), inventoryController.create);

router.route("/:id")
  .get(authorize("inventory.products", "view"), inventoryController.getById)
  .put(authorize("inventory.products", "update"), inventoryController.update)
  .delete(authorize("inventory.products", "delete"), inventoryController.remove);

// Acciones
router.post("/:id/adjust",         authorize("inventory.movements", "update"), inventoryController.adjustStock);
router.post("/stock-entry",        authorize("inventory.movements", "create"), upload.single("documento"), inventoryController.stockEntry);
router.post("/manual-usage",       authorize("inventory.movements", "create"), inventoryController.manualUsage);

export default router;