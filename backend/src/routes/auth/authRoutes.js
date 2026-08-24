import express from "express";
import authController from "../../controllers/auth/authController.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";

const router = express.Router();

// Sin roles especificados: cualquier usuario autenticado (admin, doctor, nurse, receptionist)
router.route("/me")
    .get(authenticate(), authController.getCurrentUser);
 
export default router;