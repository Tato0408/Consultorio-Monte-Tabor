import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { sendEmail } from "../../utils/sendMailMailjet.js";

import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";

import { config } from "../../../config.js";

import adminModel from "../../models/admin/admins.js";

//Array de funciones
const recoveryPasswordAdminController = {};

recoveryPasswordAdminController.requestCode = async (req, res) => {
  try {
    const { email } = req.body;

    // Valida que el correo exista en la base de datos.
    const userFound = await adminModel.findOne({ email });

    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const randomCode = crypto.randomBytes(3).toString("hex");

    const token = jsonwebtoken.sign(
      { email, randomCode, userType: "admin", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", token, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    const htmlContent = HTMLRecoveryEmail(randomCode);

    try {
      await sendEmail(email, "Recuperación de contraseña", htmlContent);
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Error al enviar el correo" });
    }
    return res.status(200).json({ message: "Correo enviado" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordAdminController.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;

    // Obtiene el token guardado en la cookie y extrae su información.
    const token = req.cookies.recoveryCookie;
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (code !== decoded.randomCode) {
      return res.status(400).json({ message: "Código inválido" });
    }

    // Si el código es correcto, genera un nuevo token marcado como
    // verificado.
    const newToken = jsonwebtoken.sign(
      { email: decoded.email, userType: "admin", verified: true },
      config.JWT.secret,
      { expiresIn: "30m" },
    );

    res.cookie("recoveryCookie", newToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    return res.status(200).json({ message: "Código verificado correctamente" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordAdminController.newPassword = async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    // Verifica que el token tenga verified en true, es decir, que ya
    // haya pasado por el paso de verificación del código.
    const token = req.cookies.recoveryCookie;
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (!decoded.verified) {
      return res.status(400).json({ message: "Código no verificado" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await adminModel.findOneAndUpdate(
      { email: decoded.email },
      { password: passwordHash },
      { new: true },
    );

    res.clearCookie("recoveryCookie");

    return res.status(200).json({ message: "Contraseña actualizada" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordAdminController.resendCode = async (req, res) => {
  try {
    // Lee el email desde la cookie anterior, no del body, así el
    // usuario no tiene que volver a ingresarlo.
    const token = req.cookies.recoveryCookie;

    if (!token) {
      return res.status(400).json({ message: "No se encontró una sesión de recuperación activa" });
    }

    const decoded = jsonwebtoken.verify(token, config.JWT.secret);
    const email = decoded.email;

    // Verifica que el usuario siga existiendo.
    const userFound = await adminModel.findOne({ email });
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const randomCode = crypto.randomBytes(3).toString("hex");

    // Genera un nuevo token, esto invalida el anterior
    // automáticamente porque la cookie se sobrescribe con el nuevo
    // valor.
    const newToken = jsonwebtoken.sign(
      { email, randomCode, userType: "admin", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" }
    );

    // Sobrescribe la cookie, el código anterior queda invalidado.
    res.cookie("recoveryCookie", newToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    const htmlContent = HTMLRecoveryEmail(randomCode);

    try {
      await sendEmail(email, "Recuperación de contraseña - Nuevo código", htmlContent);
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Error al enviar el correo" });
    }
    return res.status(200).json({ message: "Código reenviado correctamente" });

  } catch (error) {
    // Si el token expiró, la cookie ya no es válida.
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default recoveryPasswordAdminController;