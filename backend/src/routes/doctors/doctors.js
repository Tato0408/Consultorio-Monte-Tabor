import express from "express";
import doctorsController from "../../controllers/doctors/doctorsController.js";
import upload from "../../utils/CloudinaryConfig.js";
import { authenticate } from "../../middlewares/authenticateMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Catálogo liviano (mismos datos que GET "/", más los doctores espejo
// de los admins, ver doctorsController.getDoctorsCatalog) que solo
// exige sesión iniciada, sin el permiso authorize("users.doctors",
// "view"). Recepción, doctores y enfermeras necesitan este catálogo
// para agendar citas aunque su rol no tenga permiso sobre el módulo
// de administración de doctores. GET "/" sí exige ese permiso, por
// eso este catálogo separado cubre el caso de agendar citas.
router
  .route("/catalog")
  .get(authenticate(), doctorsController.getDoctorsCatalog);

// Mismo catálogo liviano de arriba, pero solo con doctores que ya tienen horario
// configurado. Usado por el registro rápido de citas del dashboard de
// enfermería/recepción (ver doctorsController.getSchedulableDoctorsCatalog). Va antes de
// "/:id" más abajo para que Express no lo capture como si "schedulable" fuera un id.
router
  .route("/catalog/schedulable")
  .get(authenticate(), doctorsController.getSchedulableDoctorsCatalog);

router
  .route("/")
  .get(authenticate(), authorize("users.doctors", "view"), doctorsController.getDoctors)

  .post(
    authenticate(),
    authorize("users.doctors", "create"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.createDoctor
  );


// Cifras reales para las tarjetas de estadísticas de /users/doctors
// (mismo patrón que /nurses/countAppointments y
// /nurses/countProcedures). Van antes de "/:id" para que Express no
// las capture como si fueran un :id.
router.route("/countPatients")
  .get(authenticate(), authorize("users.doctors", "view"), doctorsController.countPatients);

router.route("/countAppointments")
  .get(authenticate(), authorize("users.doctors", "view"), doctorsController.countAppointments);

router.route("/countProcedures")
  .get(authenticate(), authorize("users.doctors", "view"), doctorsController.countProcedures);

// Fijo al rol doctor: editar el propio perfil debe funcionar siempre,
// sin depender de la matriz de permisos dinámica (mismo patrón que
// /nurses/profile/update y /receptionist/profile/update). Va antes
// de "/:id" para que Express no lo capture como si "profile" fuera
// un :id.
router
  .route("/profile/update")
  .put(
    authenticate(["doctor"]),
    upload.single("doctorImage"),
    doctorsController.updateOwnProfile
  );

router
  .route("/:id")
  .put(
    authenticate(),
    authorize("users.doctors", "update"),
    upload.fields([
      { name: "doctorImage", maxCount: 1 },
      { name: "licenseImage", maxCount: 1 },
    ]),
    doctorsController.updateDoctors
  )
  .delete(authenticate(), authorize("users.doctors", "delete"), doctorsController.deleteDoctor);

 router
 .route("/search")
  .get(authenticate(), authorize("users.doctors", "view"), doctorsController.searchDoctors)

export default router;