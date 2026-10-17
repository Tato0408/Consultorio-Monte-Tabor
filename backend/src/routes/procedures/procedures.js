import express from 'express'
import proceduresController from '../../controllers/procedures/procedureController.js'
import { authorize, authorizeAny } from '../../middlewares/authorizeMiddleware.js'

const router = express.Router()
// El listado también lo necesita el formulario de consulta para elegir el
// procedimiento realizado, así que basta con ver Procedimientos o Consultas.
router.route("/")
.get(authorizeAny(["procedures", "view"], ["calendar.consultations", "view"]), proceduresController.getProcedures)
.post(authorize("procedures", "create"), proceduresController.insertProcedure)

router.route("/:id")
.put(authorize("procedures", "update"), proceduresController.updateProcedure)
.delete(authorize("procedures", "delete"), proceduresController.deleteProcedure)

export default router