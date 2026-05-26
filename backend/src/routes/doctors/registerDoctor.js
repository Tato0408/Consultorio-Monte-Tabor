import express from "express";
import registerDoctorController from "../../controllers/doctors/registerDoctorController.js";
import upload from "../../utils/CloudinaryConfig.js";


const router = express.Router();

router.route("/").post(
  upload.fields([
    { name: "doctorImage", maxCount: 1 },
    { name: "licenseImage", maxCount: 1 },
  ]),
  registerDoctorController.register
);

router.route("/verifyCodeEmail")
.post(registerDoctorController.verifyCode);

export default router;
