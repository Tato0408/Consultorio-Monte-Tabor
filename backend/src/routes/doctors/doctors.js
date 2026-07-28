import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(doctorsController.getDoctors)

  .post(
    authenticate,
    authorize("users.doctors", "create"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );


router
  .route("/:id")
  .put(
    authenticate,
    authorize("users.doctors", "update"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.updateDoctors
  )
  .delete(authenticate, authorize("users.doctors", "delete"), doctorsController.deleteDoctor);

 router
 .route("/search")
  .get(doctorsController.searchDoctors)

export default router;