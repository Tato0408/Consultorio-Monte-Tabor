import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(validateAuthCookie(["admin"]), doctorsController.getDoctors)
  .post(
    validateAuthCookie(["admin"]),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );

  router
  .route("/profile/update")
  .put(
    validateAuthCookie(["doctor"]),
    upload.fields([{ name: "doctorImage", maxCount: 1 }]),
    doctorsController.updateOwnProfile
  );

  router
  .route("/:id")
  .put(
    validateAuthCookie(["admin"]), 
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.updateDoctors
  )
  .delete(validateAuthCookie(["admin"]), doctorsController.deleteDoctor);

export default router;
