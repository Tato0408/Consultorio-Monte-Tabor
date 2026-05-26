import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";

import appointmentsRoutes from "./src/routes/appointments.js"
import registerPatientsRoutes from "./src/routes/patients/registerPatients.js"
import loginPatientsRoutes from "./src/routes/patients/loginPatients.js"
import patientsRoutes from "./src/routes/patients/patients.js"
import registerDoctorRoute from  "./src/routes/doctors/doctors.js"
import doctorsRoutes from "./src/routes/doctors/doctors.js"
import registerDoctorRoutes from "./src/routes/doctors/registerDoctor.js"

const app = express();

//Para que la API maneje cookies
app.use(cookieParser());

//Para que la API acepte JSON
app.use(express.json());

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    //Permitir el envío de cookies y credenciales
    credentials: true
}))

app.use("/api/appointments", appointmentsRoutes);


//Pacientes
app.use("/api/registerPatients", registerPatientsRoutes)
app.use("/api/loginPatients", loginPatientsRoutes)
app.use("/api/patients", patientsRoutes)

app.use("/api/doctors", doctorsRoutes);
app.use("/api/registerDoctors", registerDoctorRoutes);

export default app;