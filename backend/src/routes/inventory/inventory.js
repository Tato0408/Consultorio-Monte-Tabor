import express from "express";
import upload from "../../utils/CloudinaryConfig.js";
import inventoryController from "../../controllers/inventory/inventoryController.js";

const router = express.Router();

router.get("/stats", inventoryController.getStats);
router.get("/movimientos", inventoryController.getMovimientos);

router.route("/")
  .get(inventoryController.getInsumos)
  .post(upload.single("imagen"), inventoryController.createInsumo);

router.route("/:id")
  .get(inventoryController.getInsumoById)
  .put(upload.single("imagen"), inventoryController.updateInsumo)
  .delete(inventoryController.deleteInsumo);

router.post("/:id/ajuste", inventoryController.ajusteInventario);
router.post("/entrada-stock", upload.single("documento"), inventoryController.entradaStock);
router.post("/uso-manual", inventoryController.usoManual);

export default router;