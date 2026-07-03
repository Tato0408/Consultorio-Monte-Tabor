import express from "express";
import upload from "../../utils/CloudinaryConfig.js";
import inventoryController from "../../controllers/inventory/inventoryController.js";

const router = express.Router();

// Stats, movimientos y gráficas (antes de /:id para evitar conflictos)
router.get("/stats",     inventoryController.getStats);
router.get("/movements", inventoryController.getMovements);
router.get("/charts",    inventoryController.getCharts);

// CRUD principal
router.route("/")
  .get(inventoryController.getAll)
  .post(upload.single("imagen"), inventoryController.create);

router.route("/:id")
  .get(inventoryController.getById)
  .put(upload.single("imagen"), inventoryController.update)
  .delete(inventoryController.remove);

// Acciones
router.post("/:id/adjust",         inventoryController.adjustStock);
router.post("/stock-entry",        upload.single("documento"), inventoryController.stockEntry);
router.post("/manual-usage",       inventoryController.manualUsage);
router.post("/procedure-discount", inventoryController.discountFromProcedure);

export default router;
