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
import recoveryNursePassword from './src/routes/nurse/recoveryPasswordNurses.js'
import inventoryRoutes from './src/routes/inventory/inventory.js'
import proceduresRoutes from './src/routes/procedures/procedures.js'
import authRoutes from "./src/routes/auth/authRoutes.js"
import adminRoutes from "./src/routes/admin/admin.js"
import registerAdminRoute from "./src/routes/admin/registerAdmin.js"
import recoveryAdminPassword from "./src/routes/admin/recoveryPasswordAdmin.js"
const app = express();

app.use(cookieParser());

//Para que la API acepte JSON
app.use(express.json());

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    //Permitir el envío de cookies y credenciales
    credentials: true
}))

app.use("/api/recoveryDoctor", doctorRecoveryRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/registerDoctors", registerDoctorRoutes);
app.use("/api/loginDoctors", loginDoctorRoutes);
app.use("/api/recepcionist", receptionistRoutes);
app.use("/api/recoveryReceptionist", receptionistRecoveryRoutes);
app.use("/api/registerReceptionist", registerReceptionistRoutes);
app.use("/api/consultations", consultationsRoutes);
app.use("/api/nurses", nurseRoutes);
app.use("/api/recoveryNursesPassword", recoveryNursePassword);
app.use("/api/loginCommonRole", loginCommonRoleRoute);
app.use("/api/loginPatient", loginPatientRoute);
app.use("/api/logout", logoutRoute);
app.use("/api/patients", patientsRoute);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/procedures", proceduresRoutes);
app.use("/api/auth" , authRoutes);
app.use("/api/admin" , adminRoutes);
app.use("/api/registerAdmin" , registerAdminRoute);
app.use("/api/recoveryAdminPassword" , recoveryAdminPassword);

export default app;