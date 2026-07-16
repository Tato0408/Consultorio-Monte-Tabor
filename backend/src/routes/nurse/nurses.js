import express from 'express'
import nurseController from "../../controllers/nurses/nursesController.js"
import upload from '../../utils/CloudinaryConfig.js'
import { authorize } from '../../middlewares/authorizeMiddleware.js'
import { validateAuthCookie } from '../../middlewares/authMiddleware.js'
const router = express.Router()

router.route("/")
.get(authorize("users.nurses", "view"), nurseController.getAllNurses)
.post(authorize("users.nurses", "create"), upload.single("img_url"), nurseController.insertNurses)

router.route("/countNurses")
.get(authorize("users.nurses", "view"), nurseController.countNurses)

router.route("/countNotes")
.get(authorize("users.nurses", "view"), nurseController.countNotes)

router.route("/countAppointments")
.get(authorize("users.nurses", "view"), nurseController.countAppointments)

router.route("/countProcedures")
.get(authorize("users.nurses", "view"), nurseController.countProcedures)

// Hardcodeado al rol nurse: editar el propio perfil debe funcionar siempre,
// para todos los roles, sin depender de la matriz de permisos dinamica.
router
.route("/profile/update")
.put(
    validateAuthCookie(["nurse"]),
    upload.single("img_url"),
    nurseController.updateOwnProfile
);


router.route("/:id")
.put(authorize("users.nurses", "update"), upload.single("img_url"), nurseController.updateNurse)
.delete(authorize("users.nurses", "delete"), nurseController.deleteNurse)

export default router;