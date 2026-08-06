import express from "express";
import wompiController from "../controllers/wompiController.js";

const router = express.Router();

router.route("/token").post(wompiController.generarToken);
router.route("/tokenizar").post(wompiController.tokenizarTarjeta);
router.route("/paymentTest").post(wompiController.paymentTest);
router.route("/payment3DS").post(wompiController.payment3DS);

export default router;