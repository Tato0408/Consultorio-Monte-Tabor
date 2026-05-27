import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";

import appointmentsRoutes from "./src/routes/appointments.js"
import registerDoctorRoute from  "./src/routes/doctors/doctors.js"
import doctorsRoutes from "./src/routes/doctors/doctors.js"
import registerDoctorRoutes from "./src/routes/doctors/registerDoctor.js"
import loginDoctorRoutes from "./src/routes/doctors/loginDoctors.js"

import receptionistRoutes from "./src/routes/receptionist/receptionist.js"
import registerReceptionistRoutes from "./src/routes/receptionist/registerReceptionist.js"



const app = express();

app.use(cookieParser());

//Para que la API acepte JSON
app.use(express.json());

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    //Permitir el envío de cookies y credenciales
    credentials: true
}))

app.use("/api/appointments", appointmentsRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/registerDoctors", registerDoctorRoutes);
app.use("/api/loginDoctors", loginDoctorRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/registerReceptionist", registerReceptionistRoutes);
export default app;