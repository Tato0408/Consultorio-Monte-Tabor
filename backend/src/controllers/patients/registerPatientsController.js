import nodemailer from "nodemailer";
import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import patientsModel from "../../models/patients/patients.js"
import { config } from "../../../config.js"
import HTMLCreatePatient from "../../utils/HTMLCreatePatient.js";

//Array de funciones
const registerPatientController = {};

//Registro de pacientes
registerPatientController.register = async (req, res) => {
    try {
        //#1 Solicito los datos a guardar
        const {
            name,
            last_name,
            birthdate,
            email,
            password,
            is_active,
            is_verified,
            loginAttemps,
            timeOut,
        } = req.body;

        //#2 Validar si existe el correo del usuario dentro de la base de datos
        const existsPatient = await patientsModel.findOne({ email });
        if (existsPatient) {
            return res.status(400).json({ message: "Patient already exists" });
        }

        //#3 Encriptar la contraseña
        const passwordHashed = await bcryptjs.hash(password, 10);

        //#4 Generar un código aleatorio
        const randomCode = crypto.randomBytes(3).toString("hex");

        //#5 Guardamos todo en un token
        const token = jsonwebtoken.sign(
            //#1 ¿Que vamos a guardar?
            {
                randomCode,
                name,
                last_name,
                birthdate,
                email,
                password: passwordHashed,
                is_active,
                is_verified,
                loginAttemps,
                timeOut,
            },
            //#2 Configuramos la secret key
            config.JWT.secret,
            //# ¿Cuando expira?
            { expiresIn: "15m" }
        );

        //#6 Guardamos el token en una cookie
        res.cookie("registrationCookie", token, { maxAge: 15 * 60 * 1000 });

        //#7 Enviar un correo electronico

        //#1 ¿Quien lo envia?
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: config.email.user_email,
                pass: config.email.user_password
            }
        });

        //#2 ¿Quíen lo recibe?
        const mailOptions = {
            from: config.email.user_email,
            to: email,
            subject: "Verificación de cuenta",
            body: "El codigo vence en 15 minutos",
            html: HTMLCreatePatient(name, randomCode),
        };

        //#3 Enviar el correo electronico
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("error" + error);
                return res.status(500).json({ message: "Error sending email" });
            }
            return res.status(200).json({ message: "Email sent" });
        });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

//Verificacion de codigo de registro
registerPatientController.verifyCode = async (req, res) => {

    try {

        //Solicitamos el código que el usuario escribira
        const { verificationCodeRequest } = req.body;

        //Obtenemos el token de las cookies
        const token = req.cookies.registrationCookie;

        //Extraemos los datos del token
        const decoded = jsonwebtoken.verify(token, config.JWT.secret);

        const {
            randomCode: storedCode,
            name,
            last_name,
            birthdate,
            email,
            password,
            is_active,
            is_verified,
            loginAttemps,
            timeOut,
        } = decoded

        if (verificationCodeRequest !== storedCode) {
            return res.status(400).json({ message: "Invalid code" })
        }

        //Si todos los datos estan correctos guardamos en la base de datos
        const newPatient = patientsModel({
            name,
            last_name,
            birthdate,
            email,
            password,
            is_active: true,
            is_verified: true,
        });
        await newPatient.save();

        res.clearCookie("registrationCookie")
        return res.status(200).json({ message: "Patient registered" })


    } catch (error) {
        console.log("error" + error)
        return res.status(500).json({ message: "Internal server error" })
    }

}
export default registerPatientController