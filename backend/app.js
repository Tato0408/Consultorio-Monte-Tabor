import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";
import swaggerUi from "swagger-ui-express"
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
import treatmentsRoutes from './src/routes/treatments/treatments.js'
import authRoutes from "./src/routes/auth/authRoutes.js"
import adminRoutes from "./src/routes/admin/admin.js"
import registerAdminRoute from "./src/routes/admin/registerAdmin.js"
import recoveryAdminPassword from "./src/routes/admin/recoveryPasswordAdmin.js"
import recoveryNursePassword from "./src/routes/nurse/recoveryPasswordNurse.js"
import recoveryPatientPassword from "./src/routes/patients/recoveryPasswordPatient.js"
import { validateAuthCookie } from './src/middlewares/authMiddleware.js';
import { authenticate } from './src/middlewares/authenticateMiddleware.js';
import { authorize } from './src/middlewares/authorizeMiddleware.js';
import registerPatientRoutes from "./src/routes/patients/registerPatients.js"
import patientSelfRoutes from "./src/routes/patients/patientSelf.js"
import scheduleRoutes from './src/routes/schedule/schedule.js'
import nurseScheduleRoutes from './src/routes/schedule/nurseSchedule.js'
import dashboardRoutes from './src/routes/dashboard/dashboard.js'
import doctorDashboardRoutes from './src/routes/dashboard/doctorDashboard.js'
import receptionistDashboardRoutes from './src/routes/dashboard/receptionistDashboard.js'
import nurseDashboardRoutes from './src/routes/dashboard/nurseDashboard.js'
import nurse_noteRoute from './src/routes/nurse_notes/nurse_notes.js'
import rolesRoutes from './src/routes/roles/roles.js'
import permissionsRoutes from './src/routes/permissions/permissions.js'
import reportsRoutes from './src/routes/reports/reports.js'
import sickLeavesRoutes from './src/routes/sickLeaves/sickLeaves.js'
import notificationsRoutes from './src/routes/notifications/notifications.js'
import appointmentTypesRoutes from './src/routes/appointmentTypes/appointmentTypes.js'
import swaggerDocument from "./src/utils/montetabor-60e-ptc-api-1.0.0-resolved.json" with {type: "json"}
import patientPortalRoutes from './src/routes/patientPortal/patientPortal.js'
import wompiWebhookRoutes from './src/routes/webhooks/wompi.js'
import wompiRoutes from './src/routes/wompiRoutes.js'
import limiter from './src/middlewares/limiter.js'
const app = express();



app.set("trust proxy", 1);
app.use(cookieParser());
app.use(limiter)

//Para que la API acepte JSON. El "verify" guarda también el cuerpo crudo en
//req.rawBody, necesario para validar la firma HMAC de los webhooks de Wompi
app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); }
}));

app.use(cors({
    // TEMPORAL: 5176 agregado solo para pruebas locales de esta sesión (varios
    // dev servers corriendo a la vez se van a puertos consecutivos). Quitarlo
    // antes de hacer commit/push si no se necesita.
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "https://clinica-monte-tabor.vercel.app", "https://clinica-monte-tabor-6h9mwf7j4-fvp1233s-projects.vercel.app", "https://clinica-monte-tabor-3guj.vercel.app", "clinica-monte-tabor-3guj-mtduj4uws-fvp1233s-projects.vercel.app"],
    // Permite el envío de cookies y credenciales
    credentials: true
}))

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

//Endpoints públicos
app.use("/api/auth" , authRoutes);
app.use("/api/registerAdmin" , registerAdminRoute);
app.use("/api/loginCommonRole", loginCommonRoleRoute);
app.use("/api/loginPatient", loginPatientRoute);
app.use("/api/recoveryDoctor", doctorRecoveryRoutes);
app.use("/api/recoveryAdminPassword" ,recoveryAdminPassword);
app.use("/api/recoveryReceptionist", receptionistRecoveryRoutes);
app.use("/api/recoveryNursePassword", recoveryNursePassword);
app.use("/api/recoveryPatientPassword", recoveryPatientPassword);

//Endpoints privados
app.use("/api/registerDoctors", authenticate, authorize("users.doctors", "create"), registerDoctorRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/loginDoctors", loginDoctorRoutes);

app.use("/api/admin" ,adminRoutes);

app.use("/api/registerRecepcionist", authenticate, authorize("users.receptionist", "create"), registerReceptionistRoutes);
app.use("/api/recepcionist", receptionistRoutes);

app.use("/api/patients", authenticate, patientsRoute);
app.use("/api/registerPatient", registerPatientRoutes);
// Autoservicio de pacientes, usado por la app móvil. La ruta /register es
// pública y /me requiere sesión, validada a nivel de ruta dentro de
// patientSelf.js, por eso no se aplica authenticate en este archivo.
app.use("/api/patientAccount", patientSelfRoutes);

app.use("/api/nurses", authenticate, nurseRoutes);

app.use("/api/consultations", authenticate, consultationsRoutes);
app.use("/api/appointments" , authenticate , appointmentsRoutes);
app.use("/api/appointment-types", appointmentTypesRoutes);
app.use("/api/inventory", authenticate, inventoryRoutes);
app.use("/api/procedures", authenticate, proceduresRoutes);
app.use("/api/treatments", authenticate, treatmentsRoutes);
app.use("/api/schedule", authenticate, scheduleRoutes);
app.use("/api/nurse-schedule", authenticate, nurseScheduleRoutes);
app.use("/api/dashboard", validateAuthCookie(["admin"]), dashboardRoutes);
app.use("/api/doctor-dashboard", validateAuthCookie(["doctor"]), doctorDashboardRoutes);
app.use("/api/receptionist-dashboard", validateAuthCookie(["receptionist"]), receptionistDashboardRoutes);
app.use("/api/nurse-dashboard", validateAuthCookie(["nurse"]), nurseDashboardRoutes);

// Sin validateAuthCookie: cerrar sesión debe limpiar la cookie sin
// importar si el token que trae todavía es válido, si no, un token ya
// vencido o corrupto dejaría la cookie pegada en el navegador para
// siempre en vez de borrarla.
app.use("/api/logout", logoutRoute);
app.use("/api/nurse_notes",  nurse_noteRoute);
app.use("/api/roles", rolesRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/reports", authenticate, reportsRoutes);
app.use("/api/sick-leaves", authenticate, sickLeavesRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);

// Portal del paciente, sitio público solo para pacientes logueados. Sus
// endpoints propios no dependen de los permisos de staff (admin, doctor,
// enfermera, recepcionista).
app.use("/api/patient-portal", validateAuthCookie(["patient"]), patientPortalRoutes);

// Webhook de Wompi: no lleva cookie de sesión porque lo llama Wompi, no un
// navegador logueado. La seguridad la da la firma HMAC verificada dentro
// del controller.
app.use("/api/webhooks/wompi", wompiWebhookRoutes);

// Proxy directo hacia la API de Wompi (token, tokenizar tarjeta, cobrar),
// usado por la página de pago del paciente. Solo pacientes logueados
// pueden llamarlo.
app.use("/api/wompi", validateAuthCookie(["patient"]), wompiRoutes);

export default app;