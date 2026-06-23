import express from 'express'
import proceduresController from '../../controllers/procedures/procedureController.js'

const router = express.Router()
router.route("/")
.get(proceduresController.getProcedures)
.post(proceduresController.insertProcedure)

router.route("/:id")
.put(proceduresController.updateProcedure)
.delete(proceduresController.deleteProcedure)

export default router