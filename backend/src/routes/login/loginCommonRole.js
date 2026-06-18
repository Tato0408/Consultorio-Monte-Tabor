import express from 'express'
import loginController from '../../controllers/login/loginController.js'

const router = express.Router()

router.route("/")
.post(loginController.loginCommonRole)
export default router