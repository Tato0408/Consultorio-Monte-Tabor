import bcrypt from "bcryptjs";
import jsonwebtoken from 'jsonwebtoken';
import { config } from '../../../config.js';
import adminModel from "../../models/admin/admins.js";
import nurseModel from '../../models/nurses/nurses.js';
import doctorModel from '../../models/doctors/doctors.js';
import receptionistModel from "../../models/receptionist/receptionist.js";

const loginController = {}

//mapeo del nombre del rol con el su modelo para hacer busquedas dinamicas
const role_models = {
    admin: adminModel,
    doctor: doctorModel,
    nurse: nurseModel,
    receptionist: receptionistModel
};

loginController.loginCommonRole = async (req, res) => {
    try {

        // 1. Extraemos las credenciales enviadas 
        let { email, password } = req.body

        // Verifica que todos los campos sean enviados
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // 2. Sanitización de campos
        email = email?.trim()
        password = password?.trim()

        // 3. Buscamos en los 4 modelos en paralelo y nos quedamos con el primero que exista
        // Convertimos el diccionario de modelos en un arreglo de pares [nombre_rol, modelo]
        const roleEntries = Object.entries(role_models);
        // Ejecutamos las consultas de Mongoose simultáneamente en todas las colecciones utilizando Promise.all
        const results = await Promise.all(
            roleEntries.map(([, model]) => model.findOne({ email }))
        );

        // Identificamos el índice del arreglo donde el resultado NO sea nulo (es decir, el usuario existe ahí)
        const matchIndex = results.findIndex((result) => result !== null);

        // Si no se encontró el correo en ninguna de las colecciones, rechazamos la petición
        if (matchIndex === -1) {
            return res.status(400).json({ message: "User not found" });
        }

        // Extraemos el string del rol ("doctor", "nurse", "admin" o "receptionist".) basado en la posición donde hubo coincidencia
        const userType = roleEntries[matchIndex][0]; // "admin" | "doctor" | "nurse" | "receptionist"
        // Obtenemos el documento completo del usuario encontrado
        const userFound = results[matchIndex];

        // 4. Si el usuario tiene los 15 minutos de bloqueo rechaza el inicio de sesion
        if (userFound.time_out && userFound.time_out > Date.now()) {
            return res.status(400).json({ message: "User is locked" });
        }

        // 5. Compara las contraseñas, la que enviamos con la encriptada
        const isMatch = await bcrypt.compare(password, userFound.password);

        //Si no coinciden
        if (!isMatch) {
            //Aumentamos el contador de intentos fallidos
            userFound.loginAttempts = (userFound.loginAttempts || 0) + 1;

            //Si el contador llega a 5 se bloquea por 15 minutos
            if (userFound.loginAttempts >= 5) {
                userFound.time_out = Date.now() + 1000 * 60 * 15; // 15 minutos
                userFound.loginAttempts = 0;
                await userFound.save();
                return res.status(400).json({ message: "User is locked" });
            }

            //Si fallo pero el contador aun no es 5, solo se guarda el contador de intentos
            await userFound.save();
            return res.status(400).json({ message: "Wrong password" });
        }

        // 6. Login correcto: reseteamos intentos fallidos y bloqueo
        userFound.loginAttempts = 0;
        userFound.time_out = null;
        await userFound.save();

        // 7. Generamos el token, guardando el id, y su rol
        const token = jsonwebtoken.sign(
            { id: userFound._id, userType },
            config.JWT.secret,
            { expiresIn: "15m" }
        );

        //8. Se guarda el token en una cookie
        res.cookie("authCookie", token);

        //Retornamos un estado exitoso junto con informacion que usara el frontend del usuario logeado
        return res.status(200).json({
            message: "Login successful",
            token,
            userType,
            user: {
                id: userFound._id,
                email: userFound.email,
                name: userFound.name,
                last_name: userFound.last_name,
            },
        });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export default loginController;