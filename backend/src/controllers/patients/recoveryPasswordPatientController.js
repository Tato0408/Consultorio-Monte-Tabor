import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { sendEmail } from "../../utils/sendMailMailjet.js";

import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";

import { config } from "../../../config.js";
import { getPasswordError } from "../../utils/validators.js";

import patientModel from "../../models/patients/patients.js";

//Array de funciones
const recoveryPasswordController = {};

// Mismo mensaje genérico que ya usa staffRecoveryController.js: sin esto,
// requestCode devolvía 404 si el correo no existía y 200 si existía,
// permitiendo enumerar qué correos son pacientes reales del sistema.
const GENERIC_MESSAGE = "Si el correo está registrado, te enviaremos un código de verificación.";

// La web guarda el token de recuperación en una cookie porque el
// navegador la reenvía sola. La app móvil no tiene cookie jar, así
// que además de la cookie se manda recoveryToken en el body de la
// respuesta, y aquí se acepta de vuelta por header Authorization
// Bearer token (mismo patrón ya usado en authenticateMiddleware.js).
const getRecoveryToken = (req) => {
  if (req.cookies?.recoveryCookie) return req.cookies.recoveryCookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
};

recoveryPasswordController.requestCode = async (req, res) => {
  try {
    const { email } = req.body;

    const userFound = await patientModel.findOne({ email });

    // Si no hay coincidencia, no se genera cookie ni se manda correo, pero la
    // respuesta es idéntica a la de un correo que sí existe (ver GENERIC_MESSAGE).
    if (!userFound) {
      return res.status(200).json({ message: GENERIC_MESSAGE });
    }

    const randomCode = crypto.randomBytes(3).toString("hex");

    const token = jsonwebtoken.sign(
      { email, randomCode, userType: "patient", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 15 * 60 * 1000
    });

    const htmlContent = HTMLRecoveryEmail(randomCode);

    try {
      await sendEmail(email, "Recuperación de contraseña", htmlContent);
    } catch (error) {
      // No se revela si el envío falló: mismo mensaje genérico. El intento
      // queda en el log del servidor para diagnóstico.
      console.log("error" + error);
    }
    return res.status(200).json({ message: GENERIC_MESSAGE, recoveryToken: token });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordController.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;

    // Obtiene el token (de la cookie o del header) y extrae su
    // información.
    const token = getRecoveryToken(req);
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (code !== decoded.randomCode) {
      return res.status(400).json({ message: "Código inválido" });
    }

    // Si el código es correcto, genera un nuevo token marcado como
    // verificado.
    const newToken = jsonwebtoken.sign(
      { email: decoded.email, userType: "patient", verified: true },
      config.JWT.secret,
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({ message: "Código verificado correctamente", recoveryToken: newToken });
  } catch (error) {
    // Si el token expiró, la cookie ya no es válida. Antes esto caía al catch genérico y
    // el paciente veía "Error interno del servidor" sin ninguna pista de qué pasó ni de
    // que debía reiniciar el proceso (mismo fix que ya tenía resendCode, ver abajo).
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordController.newPassword = async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    // Antes este paso no exigía la misma complejidad que el registro: se podía
    // recuperar una cuenta y dejarla con una contraseña de un solo carácter.
    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Verifica que el token tenga verified en true, es decir, que ya
    // haya pasado por el paso de verificación del código.
    const token = getRecoveryToken(req);
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (!decoded.verified) {
      return res.status(400).json({ message: "Código no verificado" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await patientModel.findOneAndUpdate(
      { email: decoded.email },
      { password: passwordHash },
      { new: true },
    );

    res.clearCookie("recoveryCookie");

    return res.status(200).json({ message: "Contraseña actualizada" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordController.resendCode = async (req, res) => {
  try {
    // Lee el email desde el token anterior, no del body, así el
    // usuario no tiene que volver a ingresarlo.
    const token = getRecoveryToken(req);

    if (!token) {
      return res.status(400).json({ message: "No se encontró una sesión de recuperación activa" });
    }

    const decoded = jsonwebtoken.verify(token, config.JWT.secret);
    const email = decoded.email;

    // Verifica que el usuario siga existiendo.
    const userFound = await patientModel.findOne({ email });
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const randomCode = crypto.randomBytes(3).toString("hex");

    // Genera un nuevo token, esto invalida el anterior
    // automáticamente porque la cookie o el token se sobrescribe con
    // el nuevo valor.
    const newToken = jsonwebtoken.sign(
      { email, randomCode, userType: "patient", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" }
    );

    // Sobrescribe la cookie, el código anterior queda invalidado.
    res.cookie("recoveryCookie", newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 15 * 60 * 1000
    });

    const htmlContent = HTMLRecoveryEmail(randomCode);

    try {
      await sendEmail(email, "Recuperación de contraseña - Nuevo código", htmlContent);
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Error al enviar el correo" });
    }
    return res.status(200).json({ message: "Código reenviado correctamente", recoveryToken: newToken });

  } catch (error) {
    // Si el token expiró, la cookie ya no es válida.
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default recoveryPasswordController;
