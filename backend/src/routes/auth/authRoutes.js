import express from "express";
import authController from "../../controllers/auth/authController.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";
 
const router = express.Router();
 
// Sin roles especificados: cualquier usuario autenticado (admin, doctor, nurse, receptionist)
router.route("/me")
    .get(validateAuthCookie(), authController.getCurrentUser);
 
export default router;