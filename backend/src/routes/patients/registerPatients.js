import express from "express";
import registerPatientController from "../../controllers/patients/registerPatientsController.js";

const router = express.Router();

router.route("/").post(registerPatientController.register);

router.route("/verifyCodeEmail").post(registerPatientController.verifyCode)

export default router