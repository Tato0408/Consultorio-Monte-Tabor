import bcrypt from "bcryptjs";
import jsonwebToken from "jsonwebtoken"
import { config } from "../../../config.js"
import patientsModel from "../../models/patients/patients.js"

const loginPatientsController = {};

loginPatientsController.login = async (req, res) => {
    try {
        //#1 Solicitar los datos
        const { email, password } = req.body;
        //Verificar si el correo existe en la base de datos
        const patientFound = await patientsModel.findOne({ email })
        //Si no existe el correo
        if (!patientFound) {
            return res.status(400).json({ message: "Patient not found" })
        }

        //Verificamos que la cuenta no este bloqueada
        if (patientFound.timeOut && patientFound.timeOut > Date.now()) {
            return res.status(403).json({ message: "Blocked account" })
        }

        //Validar la contraseña
        const isMatch = bcrypt.compare(password, patientFound.password)

        //Si la contraseña es incorrecta
        if (!isMatch) {
            //Sumar 1 a la cantidad de intentos fallidos
            patientFound.loginAttemps = (patientFound.loginAttemps || 0) + 1
            if (patientFound.loginAttemps >= 5) {
                patientFound.timeOut = Date.now() + 5 * 60 * 1000;
                patientFound.loginAttemps = 0;

                await patientFound.save();
                return res.status(403).json({ message: "Blocked account for many attemps" });
            }
            await patientFound.save();
            return res.status(400).json({ message: "Wrong password" })
        }

        //Reseteamos intentos si login es correcto
        patientFound.loginAttemps = 0;
        patientFound.timeOut = null;

        //Generar el token
        const token = jsonwebToken.sign(
            //¿Qué vamos a guardar
            { id: patientFound._id, userType: "patients" },
            //LLave secreta
            config.JWT.secret,
            //Cuando expira
            { expiresIn: "30d" }

        )

        //El token lo guardamos en una cookie
        res.cookie("AuthCookie", token);

        return res.status(200).json({ message: "Login successfully" })

    } catch (error) {
        console.log("error" + error)
        return res.status(500).json({ message: "Internal server error" })
    }
};

export default loginPatientsController