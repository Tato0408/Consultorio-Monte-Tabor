import express from "express";
import staffRecoveryController from "../../controllers/recovery/staffRecoveryController.js";

const router = express.Router();

router.route("/requestCode").post(staffRecoveryController.requestCode);
router.route("/verifyCode").post(staffRecoveryController.verifyCode);
router.route("/newPassword").post(staffRecoveryController.newPassword);
router.route("/resendCode").post(staffRecoveryController.resendCode);

export default router;
