import express from "express";
import loginDoctorController from "../../controllers/doctors/loginDoctorController.js";

const router = express.Router();

router.route("/").post(loginDoctorController.login);

export default router;