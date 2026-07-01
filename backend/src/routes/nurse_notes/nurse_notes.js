import express from 'express'
import nurse_noteController from '../../controllers/nurse_notes/nusrse_notesController.js'

const router = express.Router()
router.route("/")
.get(nurse_noteController.getNurseNotes)
.post(nurse_noteController.createNurseNote)

router.route("/:id")
.put(nurse_noteController.updateNurseNote)
.delete(nurse_noteController.deleteNurseNote)

export default router