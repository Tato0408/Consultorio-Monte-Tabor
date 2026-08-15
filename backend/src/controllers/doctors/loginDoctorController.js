import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";

import { config } from "../../../config.js";

import doctorModel from "../../models/doctors/doctors.js";


const loginDoctorController = {};

loginDoctorController.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica si el correo existe en la base de datos.
    const doctorFound = await doctorModel.findOne({ email });

    if (!doctorFound) {
      return res.status(400).json({ message: "Doctor no encontrado" });
    }

    // Cuenta desactivada por un administrador: no puede iniciar sesión.
    if (doctorFound.is_active === false) {
      return res.status(403).json({
        message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
      });
    }

    // Verifica que la cuenta no esté bloqueada por intentos fallidos.
    if (doctorFound.timeOut && doctorFound.timeOut > Date.now()) {
      return res.status(403).json({ message: "Blocked account" });
    }

    // Valida la contraseña recibida contra el hash almacenado.
    const isMatch = await bcrypt.compare(password, doctorFound.password);

    if (!isMatch) {
      // Incrementa el contador de intentos fallidos.
      doctorFound.loginAttemps = (doctorFound.loginAttemps || 0) + 1;

      if (doctorFound.loginAttemps >= 5) {
        // Bloquea la cuenta durante 5 minutos tras 5 intentos fallidos.
        doctorFound.timeOut = Date.now() + 5 * 60 * 1000;
        doctorFound.loginAttemps = 0;

        await doctorFound.save();

        return res
          .status(403)
          .json({ message: "Blocked account for many attemps" });
      }

      await doctorFound.save();

      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Reinicia los intentos fallidos y el bloqueo tras un login correcto.
    doctorFound.loginAttemps = 0;
    doctorFound.timeOut = null;

    // Genera el token JWT con el id del doctor y su tipo de usuario,
    // válido durante 30 días.
    const token = jsonwebtoken.sign(
      { id: doctorFound._id, userType: "doctor" },
      config.JWTsecret,
      { expiresIn: "30d" },
    );

    // Guarda el token en una cookie con la misma duración de 30 días.
    res.cookie("authCookie", token, {maxAge: 30 * 24 * 60 * 60 * 1000});

    return res.status(200).json({ message: "Login successfully" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginDoctorController;