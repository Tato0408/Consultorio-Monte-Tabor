import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { validateAuthCookie } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Catálogo liviano (mismos datos que GET "/", más los doctores espejo de los admins — ver
// doctorsController.getDoctorsCatalog) que solo exige sesion iniciada, sin
// authorize("users.doctors","view"): recepcion, doctores y enfermeras necesitan este catalogo
// para agendar citas aunque su rol no tenga permiso sobre el modulo de administracion de
// doctores. Antes esto vivía en GET "/" y dejaba ese permiso sin ningún efecto real en el backend
// (togglear "Ver Doctores" en Roles y Permisos no bloqueaba nada). Ahora GET "/" sí exige el
// permiso, y este catálogo separado cubre el caso de uso de agendar citas.
router
  .route("/catalog")
  .get(authenticate, doctorsController.getDoctorsCatalog);

router
  .route("/")
  .get(authenticate, authorize("users.doctors", "view"), doctorsController.getDoctors)

  .post(
    authenticate,
    authorize("users.doctors", "create"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );


// Cifras reales para las tarjetas de estadísticas de /users/doctors (mismo patrón que
// /nurses/countAppointments, /nurses/countProcedures). Van antes de "/:id" para que Express no
// las capture como si fueran un :id.
router.route("/countPatients")
  .get(authenticate, authorize("users.doctors", "view"), doctorsController.countPatients);

router.route("/countAppointments")
  .get(authenticate, authorize("users.doctors", "view"), doctorsController.countAppointments);

router.route("/countProcedures")
  .get(authenticate, authorize("users.doctors", "view"), doctorsController.countProcedures);

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
  .get(authenticate, authorize("users.doctors", "view"), doctorsController.searchDoctors)

export default router;