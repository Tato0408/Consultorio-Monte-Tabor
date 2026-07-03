import express from 'express'
import nurseController from "../../controllers/nurses/nursesController.js"
import upload from '../../utils/CloudinaryConfig.js'
import { validateAuthCookie } from '../../middlewares/authMiddleware.js'
const router = express.Router()

router.route("/")
.get(validateAuthCookie(["admin"]), nurseController.getAllNurses)
.post(validateAuthCookie(["admin"]), upload.single("img_url"), nurseController.insertNurses)

router.route("/countNurses")
.get(validateAuthCookie(["admin"]), nurseController.countNurses)

router.route("/countNotes")
.get(validateAuthCookie(["admin"]), nurseController.countNotes)

router.route("/countAppointments")
.get(validateAuthCookie(["admin"]), nurseController.countAppointments)

router.route("/countProcedures")
.get(validateAuthCookie(["admin"]), nurseController.countProcedures)

router
.route("/profile/update")
.put(
    validateAuthCookie(["nurse"]),
    upload.single("img_url"),
    nurseController.updateOwnProfile
);


router.route("/:id")
.put(validateAuthCookie(["admin"]), upload.single("img_url"), nurseController.updateNurse)
.delete(validateAuthCookie(["admin"]), nurseController.deleteNurse)

export default router;