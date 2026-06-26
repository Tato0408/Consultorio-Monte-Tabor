import express from "express";
import registerAdminController from "../../controllers/admin/registerAdminController.js";
import upload from "../../utils/CloudinaryConfig.js";

const router = express.Router();

router.route("/").post(upload.single("image"), registerAdminController.register)

router.route("/verifyCodeEmail").post(registerAdminController.verifyCode);

export default router