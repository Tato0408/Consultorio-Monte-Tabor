import express from 'express';
import loginPatientController from '../../../controllers/login/loginPatient/loginPatientController.js';

const router = express.Router();

router.post('/login', loginPatientController.login);

export default router;