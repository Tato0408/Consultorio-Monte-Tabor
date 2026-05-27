import express from "express";
import loginPatientsController from "../../controllers/patients/loginPatientsController.js";

const router = express.Router();

//endpoint http://localhost:4000/api/loginPatients
router.route("/").post(loginPatientsController.login)

export default router