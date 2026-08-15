import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import patientsModel from "../../models/patients/patients.js"
import { config } from "../../../config.js"
import HTMLCreatePatient from "../../utils/HTMLCreatePatient.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

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
            return res.status(400).json({ message: "El paciente ya existe" });
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
        const htmlContent = HTMLCreatePatient(name, randomCode);

        try {
            await sendEmail(email, "Verificación de cuenta", htmlContent);
        } catch (error) {
            console.log("error" + error);
            return res.status(500).json({ message: "Error al enviar el correo" });
        }
        return res.status(200).json({ message: "Correo enviado" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
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
            return res.status(400).json({ message: "Código inválido" })
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
        return res.status(200).json({ message: "Paciente registrado" })


    } catch (error) {
        console.log("error" + error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }

}
export default registerPatientController