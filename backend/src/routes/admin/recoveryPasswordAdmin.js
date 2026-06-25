import express from "express";
import recoveryPasswordAdminController from "../../controllers/admin/recoveryPasswordAdminController.js";

const router = express.Router();

router.route("/requestCode").post(recoveryPasswordAdminController.requestCode)
router.route("/verifyCode").post(recoveryPasswordAdminController.verifyCode)
router.route("/newPassword").post(recoveryPasswordAdminController.newPassword)

export default router


