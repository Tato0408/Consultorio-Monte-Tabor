import jsonwebtoken from "jsonwebtoken"; //Generar tokens
import bcrypt from "bcryptjs"; //Encriptar la contraseña
import crypto from "crypto"; //Generar códigos aleatorios
import nodemailer from "nodemailer"; //Enviar correos

import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";

import { config } from "../../../config.js";

import patientModel from "../../models/patients/patients.js";

//Array de funciones
const recoveryPasswordController = {};

// La web guarda el token de recuperación en una cookie porque el navegador la reenvía sola.
// La app móvil no tiene cookie jar, así que además del cookie se manda "recoveryToken" en el
// body de la respuesta, y aquí se acepta de vuelta por header Authorization: Bearer <token>
// (mismo patrón ya usado en authenticateMiddleware.js / authMiddleware.js).
const getRecoveryToken = (req) => {
  if (req.cookies?.recoveryCookie) return req.cookies.recoveryCookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
};

recoveryPasswordController.requestCode = async (req, res) => {
  try {
    //#1- Solicitamos los datos
    const { email } = req.body;

    //Validar que el correo si exista en la bd
    const userFound = await patientModel.findOne({ email });

    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    //Generamos un código aleatorio
    const randomCode = crypto.randomBytes(3).toString("hex");

    //Guardamos todo en un token
    const token = jsonwebtoken.sign(
      //#1- ¿Qué vamos a guardar?
      { email, randomCode, userType: "patient", verified: false },
      //#2- Secret key
      config.JWT.secret,
      //#3- ¿cuando expira?
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", token, { maxAge: 15 * 60 * 1000 });

    //Enviar el código por correo electrónico
    //#1- ¿Quien lo envía?
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user_email,
        pass: config.email.user_password,
      },
    });

    //#2- ¿Quién lo recibe y como lo recibe?
    const mailOptions = {
      from: config.email.user_email,
      to: email,
      subject: "Recuperación de contraseña",
      body: "El código vence en 15 minutos",
      html: HTMLRecoveryEmail(randomCode),
    };

    //#3- Enviar correo electrónico
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error al enviar el correo" });
      }
      return res.status(200).json({ message: "Correo enviado", recoveryToken: token });
    });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordController.verifyCode = async (req, res) => {
  try {
    //#1- Solicitamos los datos
    const { code } = req.body;

    //Obtenemos la información que está dentro del token
    const token = getRecoveryToken(req);
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    //Ahora, comparar el código que el usuario escribió
    //con el que está guardado en el token
    if (code !== decoded.randomCode) {
      return res.status(400).json({ message: "Código inválido" });
    }

    //En cambio, si escribe bien el código
    //vamos a colocar en el token que ya está verificado
    const newToken = jsonwebtoken.sign(
      //#1- ¿Qué vamos a guardar?
      { email: decoded.email, userType: "patient", verified: true },
      //#2- Secret key
      config.JWT.secret,
      //#3- ¿Cúando expira?
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", newToken, { maxAge: 15 * 60 * 1000 });

    return res.status(200).json({ message: "Código verificado correctamente", recoveryToken: newToken });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordController.newPassword = async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;

    //Comparo las dos contraseñas
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    //Vamos a comprobar que la constante verified que está en el token
    //ya esté en true (O sea qu haya pasado por el paso 2)
    const token = getRecoveryToken(req);
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (!decoded.verified) {
      return res.status(400).json({ message: "Código no verificado" });
    }

    //////////
    //Encriptar la contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    //Actualizar la contraseña en la base de datos
    await patientModel.findOneAndUpdate(
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

recoveryPasswordController.resendCode = async (req, res) => {
  try {
    // Leemos el email desde el token anterior, no del body
    // así el usuario no tiene que volver a ingresarlo
    const token = getRecoveryToken(req);

    if (!token) {
      return res.status(400).json({ message: "No se encontró una sesión de recuperación activa" });
    }

    const decoded = jsonwebtoken.verify(token, config.JWT.secret);
    const email = decoded.email;

    // Verificamos que el usuario siga existiendo
    const userFound = await patientModel.findOne({ email });
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generamos un nuevo código aleatorio
    const randomCode = crypto.randomBytes(3).toString("hex");

    // Creamos un nuevo token — esto invalida el anterior automáticamente
    // porque la cookie/token se sobreescribe con el nuevo valor
    const newToken = jsonwebtoken.sign(
      { email, randomCode, userType: "patient", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" }
    );

    // Sobreescribimos la cookie — el código anterior queda invalidado
    res.cookie("recoveryCookie", newToken, { maxAge: 15 * 60 * 1000 });

    // Enviamos el nuevo código por correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user_email,
        pass: config.email.user_password,
      },
    });

    const mailOptions = {
      from: config.email.user_email,
      to: email,
      subject: "Recuperación de contraseña - Nuevo código",
      body: "El código vence en 15 minutos",
      html: HTMLRecoveryEmail(randomCode),
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error al enviar el correo" });
      }
      return res.status(200).json({ message: "Código reenviado correctamente", recoveryToken: newToken });
    });

  } catch (error) {
    // Si el token expiró, la cookie ya no es válida
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default recoveryPasswordController;
