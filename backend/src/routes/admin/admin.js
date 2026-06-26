import express from "express";
import adminController from "../../controllers/admin/adminController.js";
import upload from "../../utils/CloudinaryConfig.js";

const router = express.Router();

router.route("/").get(adminController.getAdmins)

router.route("/verifyEmailChange").post(adminController.verifyEmailChange);

router.route("/:id").put(upload.single("image"), adminController.updateAdmin).delete(adminController.deleteAdmin);

export default router