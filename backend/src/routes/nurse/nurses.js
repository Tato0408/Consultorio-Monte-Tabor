import express from 'express'
import nurseController from "../../controllers/nurses/nursesController.js"
import upload from '../../utils/CloudinaryConfig.js'
import { authorize } from '../../middlewares/authorizeMiddleware.js'
import { authenticate } from '../../middlewares/authenticateMiddleware.js'
const router = express.Router()

router.route("/")
.get(authorize("users.nurses", "view"), nurseController.getAllNurses)
.post(authorize("users.nurses", "create"), upload.single("img_url"), nurseController.insertNurses)

// Catálogo liviano (ver nursesController.getNursesCatalog): solo exige sesión iniciada (ya
// aplicado a nivel de router en app.js), sin el permiso "users.nurses.view". Van antes de
// "/:id" para que Express no capture "catalog" como si fuera un id.
router.route("/catalog")
.get(nurseController.getNursesCatalog)

router.route("/catalog/schedulable")
.get(nurseController.getSchedulableNursesCatalog)

router.route("/countNurses")
.get(authorize("users.nurses", "view"), nurseController.countNurses)

router.route("/countNotes")
.get(authorize("users.nurses", "view"), nurseController.countNotes)

router.route("/countAppointments")
.get(authorize("users.nurses", "view"), nurseController.countAppointments)

router.route("/countProcedures")
.get(authorize("users.nurses", "view"), nurseController.countProcedures)

// Fijo al rol nurse: editar el propio perfil debe funcionar siempre,
// sin depender de la matriz de permisos dinámica.
router
.route("/profile/update")
.put(
    authenticate(["nurse"]),
    upload.single("img_url"),
    nurseController.updateOwnProfile
);


router.route("/:id")
.put(authorize("users.nurses", "update"), upload.single("img_url"), nurseController.updateNurse)
.delete(authorize("users.nurses", "delete"), nurseController.deleteNurse)

export default router;