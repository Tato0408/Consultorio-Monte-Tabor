import express from 'express'
import nurseController from "../../controllers/nurses/nursesController.js"
import upload from '../../utils/CloudinaryConfig.js'
const router = express.Router()

router.route("/")
.get(nurseController.getAllNurses)
.post(upload.single("img_url"), nurseController.insertNurses)

router.route("/:id")
.put(upload.single("img_url"), nurseController.updateNurse)
.delete(nurseController.deleteNurse)

export default router;