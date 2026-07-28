import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";
import doctorsRoutes from "./src/routes/doctors/doctors.js"
import registerDoctorRoutes from "./src/routes/doctors/registerDoctor.js"
import loginDoctorRoutes from "./src/routes/doctors/loginDoctors.js"
import appointmentsRoutes from "./src/routes/appointments/appointments.js"
import receptionistRoutes from "./src/routes/receptionist/receptionist.js"
import registerReceptionistRoutes from "./src/routes/receptionist/registerReceptionist.js"
import consultationsRoutes from "./src/routes/consultations/consultation.js"
import patientsRoute from "./src/routes/patients/patients.js"
import nurseRoutes from './src/routes/nurse/nurses.js'
import loginCommonRoleRoute from './src/routes/login/loginCommonRole.js'
import loginPatientRoute from './src/routes/login/loginPatient/loginPatient.js'
import receptionistRecoveryRoutes from './src/routes/receptionist/recoveryPasswordReceptionist.js'
import doctorRecoveryRoutes from './src/routes/doctors/recoveryPasswordDoctor.js'
import logoutRoute from './src/routes/login/logout.js'
import inventoryRoutes from './src/routes/inventory/inventory.js'
import proceduresRoutes from './src/routes/procedures/procedures.js'
import authRoutes from "./src/routes/auth/authRoutes.js"
import adminRoutes from "./src/routes/admin/admin.js"
import registerAdminRoute from "./src/routes/admin/registerAdmin.js"
import recoveryAdminPassword from "./src/routes/admin/recoveryPasswordAdmin.js"
import recoveryNursePassword from "./src/routes/nurse/recoveryPasswordNurse.js"
import { validateAuthCookie } from './src/middlewares/authMiddleware.js';
import { authenticate } from './src/middlewares/authenticateMiddleware.js';
import { authorize } from './src/middlewares/authorizeMiddleware.js';
import registerPatientRoutes from "./src/routes/patients/registerPatients.js"
import scheduleRoutes from './src/routes/schedule/schedule.js'
import dashboardRoutes from './src/routes/dashboard/dashboard.js'
import doctorDashboardRoutes from './src/routes/dashboard/doctorDashboard.js'
import nurse_noteRoute from './src/routes/nurse_notes/nurse_notes.js'
import rolesRoutes from './src/routes/roles/roles.js'
import permissionsRoutes from './src/routes/permissions/permissions.js'
import reportsRoutes from './src/routes/reports/reports.js'
import sickLeavesRoutes from './src/routes/sickLeaves/sickLeaves.js'
const app = express();

app.use(cookieParser());

//Para que la API acepte JSON
app.use(express.json());

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    //Permitir el envío de cookies y credenciales
    credentials: true
}))

//Enpoints publicos
app.use("/api/auth" , authRoutes);
app.use("/api/registerAdmin" , registerAdminRoute);
app.use("/api/loginCommonRole", loginCommonRoleRoute);
app.use("/api/loginPatient", loginPatientRoute);
app.use("/api/recoveryDoctor", doctorRecoveryRoutes);
app.use("/api/recoveryAdminPassword" ,recoveryAdminPassword);
app.use("/api/recoveryReceptionist", receptionistRecoveryRoutes);
app.use("/api/recoveryNursePassword", recoveryNursePassword);

//Endpoints privados
app.use("/api/registerDoctors", authenticate, authorize("users.doctors", "create"), registerDoctorRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/loginDoctors", loginDoctorRoutes);

app.use("/api/admin" ,adminRoutes);

app.use("/api/registerRecepcionist", authenticate, authorize("users.receptionist", "create"), registerReceptionistRoutes);
app.use("/api/recepcionist", receptionistRoutes);

app.use("/api/patients", authenticate, patientsRoute);
app.use("/api/registerPatient", registerPatientRoutes);

app.use("/api/nurses", authenticate, nurseRoutes);

app.use("/api/consultations", authenticate, consultationsRoutes);
app.use("/api/appointments" , authenticate , appointmentsRoutes);
app.use("/api/inventory", authenticate, inventoryRoutes);
app.use("/api/procedures", authenticate, proceduresRoutes);
app.use("/api/schedule", authenticate, scheduleRoutes);
app.use("/api/dashboard", validateAuthCookie(["admin"]), dashboardRoutes);
app.use("/api/doctor-dashboard", validateAuthCookie(["doctor"]), doctorDashboardRoutes);

app.use("/api/logout", validateAuthCookie(), logoutRoute);
app.use("/api/nurse_notes",  nurse_noteRoute);
app.use("/api/roles", rolesRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/reports", authenticate, reportsRoutes);
app.use("/api/sick-leaves", authenticate, sickLeavesRoutes);

export default app;