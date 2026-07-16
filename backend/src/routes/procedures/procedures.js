import express from 'express'
import proceduresController from '../../controllers/procedures/procedureController.js'
import { authorize } from '../../middlewares/authorizeMiddleware.js'

const router = express.Router()
router.route("/")
.get(authorize("procedures", "view"), proceduresController.getProcedures)
.post(authorize("procedures", "create"), proceduresController.insertProcedure)

router.route("/:id")
.put(authorize("procedures", "update"), proceduresController.updateProcedure)
.delete(authorize("procedures", "delete"), proceduresController.deleteProcedure)

export default router