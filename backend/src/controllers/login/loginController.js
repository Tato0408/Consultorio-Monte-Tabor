import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../config.js";
import adminModel from "../../models/admin/admins.js";
import nurseModel from "../../models/nurses/nurses.js";
import doctorModel from "../../models/doctors/doctors.js";
import receptionistModel from "../../models/receptionist/receptionist.js";

// loginController.loginCommonRole se ejecuta cuando el usuario envía
// sus credenciales desde el formulario de login. Valida la identidad
// y aplica el inicio de sesión según el rol (admin, doctor, enfermera
// o recepcionista).

const loginController = {};

// Mapea el nombre de cada rol con su modelo, para hacer búsquedas
// dinámicas sobre las distintas colecciones.
const role_models = {
  admin: adminModel,
  doctor: doctorModel,
  nurse: nurseModel,
  receptionist: receptionistModel,
};

loginController.loginCommonRole = async (req, res) => {
  try {
    // 1. Extrae las credenciales enviadas en el body.
    let { email, password } = req.body;

    // Verifica que todos los campos sean enviados.
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "El correo y la contraseña son requeridos." });
    }

    // 2. Sanitización de campos.
    email = email?.trim();
    password = password?.trim();

    // 3. Busca en los 4 modelos en paralelo y se queda con el primero
    // que exista. Convierte el diccionario de modelos en un arreglo de
    // pares [nombre_rol, modelo] y ejecuta las consultas de Mongoose
    // simultáneamente en todas las colecciones con Promise.all.
    const roleEntries = Object.entries(role_models);
    const results = await Promise.all(
      roleEntries.map(([, model]) => model.findOne({ email }))
    );

    // Ubica el índice del arreglo donde el resultado no sea nulo, es
    // decir, el rol donde el usuario existe.
    const matchIndex = results.findIndex((result) => result !== null);

    // Si no se encontró el correo en ninguna de las colecciones, se
    // rechaza la petición.
    // Mismo mensaje genérico que una contraseña incorrecta (más abajo): un mensaje
    // específico de "usuario no encontrado" permite enumerar por API directa qué
    // correos existen en el sistema, aunque la interfaz ya oculte la diferencia.
    if (matchIndex === -1) {
      return res.status(400).json({ message: "Correo o contraseña incorrectos." });
    }

    // Obtiene el rol (doctor, nurse, admin o receptionist) a partir de
    // la posición donde hubo coincidencia, junto con el usuario
    // encontrado.
    const userType = roleEntries[matchIndex][0];
    const userFound = results[matchIndex];

    // 3.5 Una cuenta desactivada (doctor, recepcionista o enfermera) no puede iniciar sesión.
    // El admin queda fuera de esta regla: es el único rol que no se puede desactivar.
    if (userType !== "admin" && userFound.is_active === false) {
      return res.status(403).json({
        message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
      });
    }

    // 4. Si el usuario está dentro del periodo de bloqueo, rechaza el
    // inicio de sesión.
    if (userFound.time_out && userFound.time_out > Date.now()) {
      return res.status(400).json({ message: "Usuario bloqueado" });
    }

    // 5. Compara la contraseña recibida con la almacenada (encriptada).
    const isMatch = await bcrypt.compare(password, userFound.password);

    if (!isMatch) {
      // Aumenta el contador de intentos fallidos.
      userFound.loginAttempts = (userFound.loginAttempts || 0) + 1;

      // Si el contador llega a 5, bloquea la cuenta por 15 minutos.
      if (userFound.loginAttempts >= 5) {
        userFound.time_out = Date.now() + 1000 * 60 * 15;
        userFound.loginAttempts = 0;
        await userFound.save();
        return res.status(400).json({ message: "Usuario bloqueado" });
      }

      // Si falló pero el contador aún no llega a 5, solo se guarda el
      // contador de intentos.
      await userFound.save();
      return res.status(400).json({ message: "Correo o contraseña incorrectos." });
    }

    // 6. Login correcto: reinicia los intentos fallidos y el bloqueo.
    userFound.loginAttempts = 0;
    userFound.time_out = null;
    await userFound.save();

    // 7. Genera el token JWT con el id del usuario y su rol.
    const token = jsonwebtoken.sign(
      { id: userFound._id, userType },
      config.JWT.secret,
      { expiresIn: "30d" }
    );

    // 8. Guarda el token en una cookie.
    res.cookie("authCookie", token ,{
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Retorna un estado exitoso junto con la información que usará el
    // frontend del usuario autenticado.
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
        phone: userFound.phone || null,
        gender: userFound.gender || null,
        is_active: userFound.is_active,
        is_verified: userFound.is_verified,
        // Cada modelo usa un nombre de campo distinto para la foto
        // (admin usa image, doctor, enfermera y recepcionista usan
        // img_url). Aplica el mismo fallback que
        // authController.getCurrentUser, para que la foto se vea desde
        // el login sin esperar a un refresh.
        image: userFound.image || userFound.img_url || null,
        public_id: userFound.public_id || userFound.img_public_id || null,
        // Firma y sello guardados del doctor o admin, para que el perfil y
        // los PDF los tengan desde el inicio de sesión.
        signature_url: userFound.signature_url || null,
        seal_url: userFound.seal_url || null,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginController;
