import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../../config.js";
import patientModel from "./../../../models/patients/patients.js";

const loginController = {};

loginController.login = async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword } = req.body;

    if (!rawEmail || !rawPassword) {
      return res
        .status(400)
        .json({ message: "El correo y la contraseña son requeridos." });
    }

    // Se limpian los espacios y se asignan a nuevas constantes de forma segura
    const email = rawEmail.trim();
    const password = rawPassword.trim();

    const response = await patientModel.findOne({ email });
    if (!response) {
      return res.status(400).json({ message: "Correo o contraseña inválidos." });
    }
    if (response.is_active === false) {
      return res.status(403).json({
        message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
      });
    }
    if (response.timeOut && response.timeOut > Date.now()) {
      return res.status(400).json({ message: "Usuario bloqueado" });
    }
    const isMatch = await bcrypt.compare(password, response.password);
    if (!isMatch) {
      response.loginAttemps = (response.loginAttemps || 0) + 1;

      // Si el contador llega a 5 se bloquea por 15 minutos
      if (response.loginAttemps >= 5) {
        response.timeOut = Date.now() + 1000 * 60 * 15; // 15 minutos
        response.loginAttemps = 0;
        await response.save();
        return res.status(400).json({ message: "Usuario bloqueado" });
      }

      // Si falló pero el contador aún no es 5, solo se guarda el contador de intentos
      await response.save();
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }
    response.loginAttemps = 0;
    response.timeOut = null;
    await response.save();
    const token = jsonwebtoken.sign(
      { id: response._id, userType: "patient" },
      config.JWT.secret,
      { expiresIn: "15m" },
    );

    res.cookie("authCookie", token, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      userType: "patient",
      user: {
        id: response._id,
        email: response.email,
        name: response.name,
        last_name: response.last_name,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginController;
