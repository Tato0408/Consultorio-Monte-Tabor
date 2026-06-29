import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(doctorsController.getDoctors)
  
  .post(
    validateAuthCookie(["admin"]),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
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

 router
 .route("/search")
  .get(doctorsController.searchDoctors)

export default router;
