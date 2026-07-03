import express from "express";
import adminController from "../../controllers/admin/adminController.js";
import upload from "../../utils/CloudinaryConfig.js";
import {validateAuthCookie} from "../../middlewares/authMiddleware.js"
const router = express.Router();

router.route("/check").get(adminController.checkAdminExists);
router.use(validateAuthCookie(["admin"]));
router.route("/").get(adminController.getAdmins)

router.route("/verifyEmailChange").post(adminController.verifyEmailChange);

router.route("/:id").put(upload.single("image"), adminController.updateAdmin)
.delete(validateAuthCookie(["admin"]),adminController.deleteAdmin);

export default router   