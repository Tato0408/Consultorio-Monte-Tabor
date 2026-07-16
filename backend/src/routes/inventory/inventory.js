import express from "express";
import upload from "../../utils/CloudinaryConfig.js";
import inventoryController from "../../controllers/inventory/inventoryController.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Stats, movimientos y gráficas (antes de /:id para evitar conflictos)
router.get("/stats",     authorize("inventory.reports", "view"), inventoryController.getStats);
router.get("/movements", authorize("inventory.movements", "view"), inventoryController.getMovements);
router.get("/charts",    authorize("inventory.reports", "view"), inventoryController.getCharts);

// CRUD principal
router.route("/")
  .get(authorize("inventory.products", "view"), inventoryController.getAll)
  .post(authorize("inventory.products", "create"), upload.single("imagen"), inventoryController.create);

router.route("/:id")
  .get(authorize("inventory.products", "view"), inventoryController.getById)
  .put(authorize("inventory.products", "update"), upload.single("imagen"), inventoryController.update)
  .delete(authorize("inventory.products", "delete"), inventoryController.remove);

// Acciones
router.post("/:id/adjust",         authorize("inventory.movements", "update"), inventoryController.adjustStock);
router.post("/stock-entry",        authorize("inventory.movements", "create"), upload.single("documento"), inventoryController.stockEntry);
router.post("/manual-usage",       authorize("inventory.movements", "create"), inventoryController.manualUsage);
router.post("/procedure-discount", authorize("inventory.movements", "create"), inventoryController.discountFromProcedure);

export default router;