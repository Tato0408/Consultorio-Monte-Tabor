import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import patientsModel from "../../models/patients/patients.js"
import { config } from "../../../config.js"
import HTMLCreatePatient from "../../utils/HTMLCreatePatient.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";
import { getMissingRequiredField, validateUserFieldFormats, getPasswordError } from "../../utils/validators.js";

// Mismo enum que ofrece el formulario de pacientes del panel privado (PatientFormModal.jsx).
const GENEROS_VALIDOS = ["Masculino", "Femenino"];

//Array de funciones
const registerPatientController = {};

//Registro de pacientes
// Exclusivo del portal público web (a diferencia de patientSelfController.register, el
// registro de la app móvil). Un formulario abierto en internet está más expuesto a
// registros falsos o de spam que una app instalada desde las tiendas oficiales, así que
// acá los datos no crean al paciente todavía: viajan en una cookie firmada de 15 min
// hasta que se confirma el código enviado por correo (ver verifyCodeEmail más abajo); el
// registro móvil, en cambio, crea al paciente de inmediato ya activo y verificado.
registerPatientController.register = async (req, res) => {
    try {
        //#1 Solicito los datos a guardar. birth_date es el nombre del campo en el modelo;
        //   se acepta también "birthdate" por compatibilidad con clientes viejos.
        let {
            name,
            last_name,
            birth_date,
            birthdate,
            phone,
            dui,
            gender,
            email,
            password,
            is_active,
            is_verified,
            loginAttemps,
            timeOut,
        } = req.body;

        birth_date = birth_date || birthdate;
        // El DUI es opcional (menores de edad sin DUI).
        dui = dui?.trim() || undefined;

        //#1.1 Validaciones de campos obligatorios y de formato (mismas reglas que el panel privado)
        const requiredError = getMissingRequiredField(
            { name, last_name, birth_date, phone, gender, email, password },
            ["name", "last_name", "birth_date", "phone", "gender", "email", "password"]
        );
        if (requiredError) {
            return res.status(400).json({ message: requiredError });
        }

        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        if (!GENEROS_VALIDOS.includes(gender)) {
            return res.status(400).json({ message: "Género no válido" });
        }

        const passwordError = getPasswordError(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        //#2 Validar si existe el correo (o el DUI) del usuario dentro de la base de datos
        const existsPatient = await patientsModel.findOne({ email });
        if (existsPatient) {
            return res.status(400).json({ message: "El paciente ya existe" });
        }
        if (dui) {
            const duiTaken = await patientsModel.findOne({ dui });
            if (duiTaken) {
                return res.status(400).json({ message: "Ya existe un paciente registrado con ese DUI" });
            }
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
                birth_date,
                phone,
                dui,
                gender,
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

        //#6 Guardamos el token en una cookie. maxAge igual al expiresIn del JWT de arriba
        //(15 min): antes decía 30 días, una cookie que sobrevive muchísimo más que el
        //token que contiene adentro (inofensivo porque jsonwebtoken igual la rechaza al
        //expirar, pero engañoso para quien lea el código).
        res.cookie("registrationCookie", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 15 * 60 * 1000
        });

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

        // Si el token de registro (15 min) ya expiró o la cookie nunca llegó,
        // jsonwebtoken.verify lanza (TokenExpiredError / JsonWebTokenError). Sin
        // este chequeo caía al catch genérico de abajo y el paciente veía un 500
        // "Error interno del servidor" en vez de un mensaje que explique qué pasó
        // y qué hacer (volver a registrarse para recibir un código nuevo).
        let decoded;
        try {
            decoded = jsonwebtoken.verify(token, config.JWT.secret);
        } catch (jwtError) {
            return res.status(400).json({
                message: "El código de verificación expiró o el enlace ya no es válido. Vuelve a registrarte para recibir uno nuevo.",
            });
        }

        const {
            randomCode: storedCode,
            name,
            last_name,
            birth_date,
            phone,
            dui,
            gender,
            email,
            password,
        } = decoded

        if (verificationCodeRequest !== storedCode) {
            return res.status(400).json({ message: "Código inválido" })
        }

        //Si todos los datos estan correctos guardamos en la base de datos.
        //birth_date (no "birthdate"): así es el campo en el modelo, antes se guardaba con
        //el nombre equivocado y Mongoose lo descartaba silenciosamente.
        const newPatient = patientsModel({
            name,
            last_name,
            birth_date,
            phone,
            gender,
            email,
            password,
            // El DUI es opcional: solo se guarda si el paciente lo proporcionó.
            ...(dui ? { dui } : {}),
            is_active: true,
            is_verified: true,
        });
        try {
            await newPatient.save();
        } catch (saveError) {
            // El índice único de email/dui (ver el modelo) es lo que realmente cierra la
            // condición de carrera: dos registros con el mismo correo dentro de la ventana
            // de 15 min del código antes podían crear cada uno su propio paciente sin
            // ningún error. Si el segundo llega a guardarse, Mongo rechaza el insert con un
            // error de llave duplicada (E11000) en vez de un 500 genérico.
            if (saveError?.code === 11000) {
                const field = saveError.keyPattern?.dui ? "DUI" : "correo";
                return res.status(400).json({ message: `Ya existe un paciente registrado con ese ${field}` });
            }
            throw saveError;
        }

        res.clearCookie("registrationCookie")
        return res.status(200).json({ message: "Paciente registrado" })


    } catch (error) {
        console.log("error" + error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }

}
export default registerPatientController