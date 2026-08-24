import { Router } from "express";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { getMyPermissions } from "../../controllers/permissions/permissionsController.js";

const router = Router();

router.get("/me", authenticate(), getMyPermissions);

export default router;
