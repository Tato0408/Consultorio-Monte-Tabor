import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../config.js";
import adminModel from "../../models/admin/admins.js";
import nurseModel from "../../models/nurses/nurses.js";
import doctorModel from "../../models/doctors/doctors.js";
import receptionistModel from "../../models/receptionist/receptionist.js";

//LoginController se ejecuta una vez cuando el usuario escribe sus credenciales en el formulario de login, y da click en iniciar sesion, valida la identidad y aplica el inicio de sesion dependiendo del rol

const loginController = {};

//mapeo del nombre del rol con el su modelo para hacer busquedas dinamicas
const role_models = {
  admin: adminModel,
  doctor: doctorModel,
  nurse: nurseModel,
  receptionist: receptionistModel,
};

loginController.loginCommonRole = async (req, res) => {
  try {
    // 1. Extraemos las credenciales enviadas
    let { email, password } = req.body;

    // Verifica que todos los campos sean enviados
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "El correo y la contraseña son requeridos." });
    }

    // 2. Sanitización de campos
    email = email?.trim();
    password = password?.trim();

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
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Extraemos el string del rol ("doctor", "nurse", "admin" o "receptionist".) basado en la posición donde hubo coincidencia
    const userType = roleEntries[matchIndex][0]; // "admin" | "doctor" | "nurse" | "receptionist"
    // Obtenemos el documento completo del usuario encontrado
    const userFound = results[matchIndex];

    // 3.5 Una cuenta desactivada (doctor, recepcionista o enfermera) no puede iniciar sesión.
    // El admin queda fuera de esta regla: es el único rol que no se puede desactivar.
    if (userType !== "admin" && userFound.is_active === false) {
      return res.status(403).json({
        message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
      });
    }

    // 4. Si el usuario tiene los 15 minutos de bloqueo rechaza el inicio de sesion
    if (userFound.time_out && userFound.time_out > Date.now()) {
      return res.status(400).json({ message: "Usuario bloqueado" });
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
        return res.status(400).json({ message: "Usuario bloqueado" });
      }

      //Si fallo pero el contador aun no es 5, solo se guarda el contador de intentos
      await userFound.save();
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // 6. Login correcto: reseteamos intentos fallidos y bloqueo
    userFound.loginAttempts = 0;
    userFound.time_out = null;
    await userFound.save();

    // 7. Generamos el token, guardando el id, y su rol
    const token = jsonwebtoken.sign(
      { id: userFound._id, userType },
      config.JWT.secret,
      { expiresIn: "30d" }
    );

    //8. Se guarda el token en una cookie
    res.cookie("authCookie", token);

    //Retornamos un estado exitoso junto con informacion que usara el frontend del usuario logeado
    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      userType,
      user: {
        id: userFound._id,
        email: userFound.email,
        name: userFound.name,
        last_name: userFound.last_name,
        dui: userFound.dui,
        birth_date: userFound.birth_date,
        gender: userFound.gender,
        is_active: userFound.is_active,
        is_verified: userFound.is_verified,
        // Cada modelo usa un nombre distinto para la foto (admin: "image", doctor/enfermera/
        // recepcionista: "img_url") — mismo fallback que ya usa authController.getCurrentUser,
        // para que la foto se vea desde el primer momento del login y no solo tras un refresh.
        image: userFound.image || userFound.img_url || null,
        public_id: userFound.public_id || userFound.img_public_id || null,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginController;
