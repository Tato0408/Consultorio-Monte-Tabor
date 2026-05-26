import express from "express";
import registerPatientController from "../../controllers/patients/registerPatientsController.js";

const router = express.Router();

//endpoint http://localhost:4000/api/registerPatients
router.route("/").post(registerPatientController.register);

//endpoint http://localhost:4000/api/registerPatients/verifyCodeEmail
router.route("/verifyCodeEmail").post(registerPatientController.verifyCode)

export default router