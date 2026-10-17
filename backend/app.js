import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";
import swaggerUi from "swagger-ui-express"
import doctorsRoutes from "./src/routes/doctors/doctors.js"
import registerDoctorRoutes from "./src/routes/doctors/registerDoctor.js"
import appointmentsRoutes from "./src/routes/appointments/appointments.js"
import receptionistRoutes from "./src/routes/receptionist/receptionist.js"
import registerReceptionistRoutes from "./src/routes/receptionist/registerReceptionist.js"
import consultationsRoutes from "./src/routes/consultations/consultation.js"
import labOrdersRoutes from "./src/routes/consultations/labOrder.js"
import prescriptionsRoutes from "./src/routes/consultations/prescription.js"
import patientsRoute from "./src/routes/patients/patients.js"
import nurseRoutes from './src/routes/nurse/nurses.js'
import loginCommonRoleRoute from './src/routes/login/loginCommonRole.js'
import loginPatientRoute from './src/routes/login/loginPatient/loginPatient.js'
import logoutRoute from './src/routes/login/logout.js'
import inventoryRoutes from './src/routes/inventory/inventory.js'
import proceduresRoutes from './src/routes/procedures/procedures.js'
import treatmentsRoutes from './src/routes/treatments/treatments.js'
import authRoutes from "./src/routes/auth/authRoutes.js"
import adminRoutes from "./src/routes/admin/admin.js"
import registerAdminRoute from "./src/routes/admin/registerAdmin.js"
import recoveryPatientPassword from "./src/routes/patients/recoveryPasswordPatient.js"
// Reemplaza los 4 endpoints separados de recuperación de staff (admin, doctor, enfermera,
// recepcionista): el formulario "Olvidé mi contraseña" del panel privado no sabe el rol de
// antemano, así que antes probaba los 4 en secuencia, y el 404/200 de cada uno permitía
// enumerar por API directa qué rol tiene cada correo. Ver staffRecoveryController.js.
import staffRecoveryRoutes from "./src/routes/recovery/staffRecovery.js"
import { authenticate } from './src/middlewares/authenticateMiddleware.js';
import { authorize } from './src/middlewares/authorizeMiddleware.js';
import { requireActiveUser } from './src/middlewares/requireActiveUser.js';
import registerPatientRoutes from "./src/routes/patients/registerPatients.js"
import patientSelfRoutes from "./src/routes/patients/patientSelf.js"
import scheduleRoutes from './src/routes/schedule/schedule.js'
import nurseScheduleRoutes from './src/routes/schedule/nurseSchedule.js'
import dashboardRoutes from './src/routes/dashboard/dashboard.js'
import doctorDashboardRoutes from './src/routes/dashboard/doctorDashboard.js'
import receptionistDashboardRoutes from './src/routes/dashboard/receptionistDashboard.js'
import nurseDashboardRoutes from './src/routes/dashboard/nurseDashboard.js'
import rolesRoutes from './src/routes/roles/roles.js'
import permissionsRoutes from './src/routes/permissions/permissions.js'
import reportsRoutes from './src/routes/reports/reports.js'
import sickLeavesRoutes from './src/routes/sickLeaves/sickLeaves.js'
import notificationsRoutes from './src/routes/notifications/notifications.js'
import { uploadErrorHandler } from "./src/middlewares/uploadErrorHandler.js";
import appointmentTypesRoutes from './src/routes/appointmentTypes/appointmentTypes.js'
import swaggerDocument from "./src/utils/montetabor-60e-ptc-api-1.0.0-resolved.json" with {type: "json"}
import patientPortalRoutes from './src/routes/patientPortal/patientPortal.js'
import wompiWebhookRoutes from './src/routes/webhooks/wompi.js'
import wompiRoutes from './src/routes/wompiRoutes.js'
import limiter from './src/middlewares/limiter.js'
import { ALLOWED_ORIGINS } from './src/config/allowedOrigins.js'
const app = express();



app.set("trust proxy", 1);
app.use(cookieParser());
app.use(limiter)

//Para que la API acepte JSON. El "verify" guarda también el cuerpo crudo en
//req.rawBody, necesario para validar la firma HMAC de los webhooks de Wompi
app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); }
}));

// Express 5 deja req.body en undefined cuando la petición no trae cuerpo (en
// Express 4 quedaba en {}). Todo el proyecto asume {}, así que se restaura ese
// valor por defecto y ningún handler revienta al leer o desestructurar
// req.body en una petición sin cuerpo (ej. PATCH de cancelar cita sin motivo).
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

app.use(cors({
    // El último dominio le faltaba el esquema "https://": el navegador siempre manda el
    // Origin completo (con esquema), así que tal como estaba escrito nunca podía calzar
    // con nada — ese despliegue de Vercel quedaba bloqueado por CORS sin que nada lo
    // explicara en los logs (el navegador simplemente no manda el error real a JS).
    origin: ALLOWED_ORIGINS,
    // Permite el envío de cookies y credenciales
    credentials: true,
    // X-Renewed-Token (ver authenticateMiddleware.js): un navegador no expone headers de
    // respuesta a JS salvo que se listen aquí explícitamente. La app móvil no está sujeta
    // a esta restricción (su fetch no aplica CORS), pero se expone igual por si algún
    // consumidor web llega a necesitarlo.
    exposedHeaders: ["X-Renewed-Token"],
}))

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

//Endpoints públicos
app.use("/api/auth" , authRoutes);
app.use("/api/registerAdmin" , registerAdminRoute);
app.use("/api/loginCommonRole", loginCommonRoleRoute);
app.use("/api/loginPatient", loginPatientRoute);
app.use("/api/staffRecovery", staffRecoveryRoutes);
app.use("/api/recoveryPatientPassword", recoveryPatientPassword);

//Endpoints privados
// requireActiveUser antes solo se montaba en doctor-dashboard y
// patient-portal: desactivar a una enfermera o recepcionista (o a un doctor
// fuera de su propio dashboard) no les cortaba el acceso a ninguna ruta de
// negocio real (citas, consultas, inventario, tratamientos, procedimientos,
// pacientes, horarios) hasta que su token expirara (30 días). Se aplica
// ahora también aquí; es un no-op para admin (modelByRole no lo incluye).
app.use("/api/registerDoctors", authenticate(), authorize("users.doctors", "create"), registerDoctorRoutes);
app.use("/api/doctors", authenticate(), requireActiveUser, doctorsRoutes);
// /api/loginDoctors se retiró: era un login duplicado y roto (firmaba el
// JWT con config.JWTsecret, una propiedad que no existe, así que cualquier
// login exitoso ahí habría reventado con 500) que ningún frontend consumía
// — el login real de doctor ya pasa por /api/loginCommonRole.

app.use("/api/admin" ,adminRoutes);

app.use("/api/registerRecepcionist", authenticate(), authorize("users.receptionist", "create"), registerReceptionistRoutes);
app.use("/api/recepcionist", authenticate(), requireActiveUser, receptionistRoutes);

app.use("/api/patients", authenticate(), requireActiveUser, patientsRoute);
app.use("/api/registerPatient", registerPatientRoutes);
// Autoservicio de pacientes, usado por la app móvil. La ruta /register es
// pública y /me requiere sesión, validada a nivel de ruta dentro de
// patientSelf.js, por eso no se aplica authenticate en este archivo.
app.use("/api/patientAccount", patientSelfRoutes);

app.use("/api/nurses", authenticate(), requireActiveUser, nurseRoutes);

app.use("/api/consultations", authenticate(), requireActiveUser, consultationsRoutes);
app.use("/api/lab-orders", authenticate(), requireActiveUser, labOrdersRoutes);
app.use("/api/prescriptions", authenticate(), requireActiveUser, prescriptionsRoutes);
app.use("/api/appointments" , authenticate() , requireActiveUser, appointmentsRoutes);
app.use("/api/appointment-types", appointmentTypesRoutes);
app.use("/api/inventory", authenticate(), requireActiveUser, inventoryRoutes);
app.use("/api/procedures", authenticate(), requireActiveUser, proceduresRoutes);
app.use("/api/treatments", authenticate(), requireActiveUser, treatmentsRoutes);
app.use("/api/schedule", authenticate(), requireActiveUser, scheduleRoutes);
app.use("/api/nurse-schedule", authenticate(), requireActiveUser, nurseScheduleRoutes);
app.use("/api/dashboard", authenticate(["admin"]), dashboardRoutes);
app.use("/api/doctor-dashboard", authenticate(["doctor"]), requireActiveUser, doctorDashboardRoutes);
app.use("/api/receptionist-dashboard", authenticate(["receptionist"]), requireActiveUser, receptionistDashboardRoutes);
app.use("/api/nurse-dashboard", authenticate(["nurse"]), requireActiveUser, nurseDashboardRoutes);

// Sin authenticate(): cerrar sesión debe limpiar la cookie sin
// importar si el token que trae todavía es válido, si no, un token ya
// vencido o corrupto dejaría la cookie pegada en el navegador para
// siempre en vez de borrarla.
app.use("/api/logout", logoutRoute);
// El endpoint /api/nurse_notes se retiró: era una colección duplicada y sin
// uso (la nota de enfermería real vive embebida en Consultation.nurse_note,
// ver PATCH /consultations/:id/nurse-note) que además nunca tuvo authorize(),
// así que cualquier rol autenticado podía leer o escribir TODAS las notas
// del sistema sin filtro. El modelo nurse_notes.js se conserva solo porque
// cascadeDelete.js todavía limpia esa colección al borrar un paciente,
// doctor o enfermera, por si quedan registros antiguos.
app.use("/api/roles", rolesRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/reports", authenticate(), requireActiveUser, reportsRoutes);
app.use("/api/sick-leaves", authenticate(), requireActiveUser, sickLeavesRoutes);
app.use("/api/notifications", authenticate(), requireActiveUser, notificationsRoutes);

// Portal del paciente, sitio público solo para pacientes logueados. Sus
// endpoints propios no dependen de los permisos de staff (admin, doctor,
// enfermera, recepcionista).
app.use("/api/patient-portal", authenticate(["patient"]), requireActiveUser, patientPortalRoutes);

// Webhook de Wompi: no lleva cookie de sesión porque lo llama Wompi, no un
// navegador logueado. La seguridad la da la firma HMAC verificada dentro
// del controller.
app.use("/api/webhooks/wompi", wompiWebhookRoutes);

// Proxy directo hacia la API de Wompi (token, tokenizar tarjeta, cobrar),
// usado por la página de pago del paciente. Solo pacientes logueados
// pueden llamarlo. requireActiveUser corta el acceso de inmediato si la
// cuenta se desactiva mientras la sesión sigue viva (sin esto, un paciente
// recién desactivado podía seguir tokenizando tarjetas y cobrando).
app.use("/api/wompi", authenticate(["patient"]), requireActiveUser, wompiRoutes);

// Endpoint liviano para un monitor externo (por ejemplo UptimeRobot o
// cron-job.org) que lo consulte cada 10 minutos. En el plan gratuito de Render
// el servidor se duerme tras 15 minutos sin tráfico, y dormido no puede
// enviar recordatorios ni notificaciones push.
app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

// Convierte los errores de subida de imágenes (multer y Cloudinary) en una
// respuesta JSON con la causa. Va después de todas las rutas.
app.use(uploadErrorHandler);

export default app;