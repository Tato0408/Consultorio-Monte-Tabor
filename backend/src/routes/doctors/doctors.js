import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";

const router = express.Router();

router
  .route("/")
  .get(doctorsController.getDoctors)
  
  .post(
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );

  
router
  .route("/:id")
  .put(
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.updateDoctors
  )
  .delete(doctorsController.deleteDoctor);

 router
 .route("/search")
  .get(doctorsController.getDoctors)

export default router;