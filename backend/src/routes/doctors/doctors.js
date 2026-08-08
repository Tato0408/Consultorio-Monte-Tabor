import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Solo exige sesion iniciada (authenticate), sin authorize("users.doctors","view"):
// recepcion, doctores y enfermeras necesitan este catalogo para agendar citas aunque
// su rol no tenga permiso sobre el modulo de administracion de doctores.
router
  .route("/")
  .get(authenticate, doctorsController.getDoctors)

  .post(
    authenticate,
    authorize("users.doctors", "create"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );


// Hardcodeado al rol doctor: editar el propio perfil debe funcionar siempre, para todos los
// roles, sin depender de la matriz de permisos dinamica (mismo patrón que
// /nurses/profile/update y /receptionist/profile/update). Va antes de "/:id" para que Express
// no lo capture como si "profile" fuera un :id.
router
  .route("/profile/update")
  .put(
    validateAuthCookie(["doctor"]),
    upload.single("doctorImage"),
    doctorsController.updateOwnProfile
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
  .get(authenticate, doctorsController.searchDoctors)

export default router;