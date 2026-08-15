import bcrypt from "bcryptjs";
import jsonwebToken from "jsonwebtoken"
import { config } from "../../../config.js"
import patientsModel from "../../models/patients/patients.js"

const loginPatientsController = {};

loginPatientsController.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verifica si el correo existe en la base de datos.
        const patientFound = await patientsModel.findOne({ email })
        if (!patientFound) {
            return res.status(400).json({ message: "Patient not found" })
        }

        // Verifica que la cuenta no esté bloqueada por intentos fallidos.
        if (patientFound.timeOut && patientFound.timeOut > Date.now()) {
            return res.status(403).json({ message: "Blocked account" })
        }

        // Valida la contraseña recibida contra el hash almacenado.
        const isMatch = bcrypt.compare(password, patientFound.password)

        if (!isMatch) {
            // Incrementa el contador de intentos fallidos.
            patientFound.loginAttemps = (patientFound.loginAttemps || 0) + 1
            if (patientFound.loginAttemps >= 5) {
                // Bloquea la cuenta durante 5 minutos tras 5 intentos.
                patientFound.timeOut = Date.now() + 5 * 60 * 1000;
                patientFound.loginAttemps = 0;

                await patientFound.save();
                return res.status(403).json({ message: "Blocked account for many attemps" });
            }
            await patientFound.save();
            return res.status(400).json({ message: "Contraseña incorrecta" })
        }

        // Reinicia los intentos fallidos y el bloqueo tras un login
        // correcto.
        patientFound.loginAttemps = 0;
        patientFound.timeOut = null;

        // Genera el token JWT con el id del paciente y su tipo de
        // usuario, válido durante 30 días.
        const token = jsonwebToken.sign(
            { id: patientFound._id, userType: "patients" },
            config.JWT.secret,
            { expiresIn: "30d" }

        )

        // Guarda el token en una cookie.
        res.cookie("AuthCookie", token);

        return res.status(200).json({ message: "Login successfully" })

    } catch (error) {
        console.log("error" + error)
        return res.status(500).json({ message: "Error interno del servidor" })
    }
};

export default loginPatientsController