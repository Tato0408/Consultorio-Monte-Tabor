import express from "express";
import wompiWebhookController from "../../controllers/webhooks/wompiWebhookController.js";

const router = express.Router();

router.post("/", wompiWebhookController.handle);

export default router;