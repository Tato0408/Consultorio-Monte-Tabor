import jsonwebtoken from "jsonwebtoken"; //Generar tokens
import bcrypt from "bcryptjs"; //Encriptar la contraseña
import crypto from "crypto"; //Generar códigos aleatorios

import { sendEmail } from "../../utils/sendMailMailjet.js"; //Enviar correos

import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";

import { config } from "../../../config.js";

import adminModel from "../../models/admin/admins.js";

//Array de funciones
const recoveryPasswordAdminController = {};

recoveryPasswordAdminController.requestCode = async (req, res) => {
  try {
    //#1- Solicitamos los datos
    const { email } = req.body;

    //Validar que el correo si exista en la bd
    const userFound = await adminModel.findOne({ email });

    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    //Generamos un código aleatorio
    const randomCode = crypto.randomBytes(3).toString("hex");

    //Guardamos todo en un token
    const token = jsonwebtoken.sign(
      //#1- ¿Qué vamos a guardar?
      { email, randomCode, userType: "admin", verified: false },
      //#2- Secret key
      config.JWT.secret,
      //#3- ¿cuando expira?
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", token, { maxAge: 30 * 60 * 1000 });

    //Enviar el código por correo electrónico
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
    //#1- Solicitamos los datos
    const { code } = req.body;

    //Obtenemos la información que está dentro del token
    //Accedemos a la cookie
    const token = req.cookies.recoveryCookie;
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
      { email: decoded.email, userType: "admin", verified: true },
      //#2- Secret key
      config.JWT.secret,
      //#3- ¿Cúando expira?
      { expiresIn: "30m" },
    );

    res.cookie("recoveryCookie", newToken, { maxAge: 30 * 60 * 1000 });

    return res.status(200).json({ message: "Código verificado correctamente" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

recoveryPasswordAdminController.newPassword = async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;

    //Comparo las dos contraseñas
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    //Vamos a comprobar que la constante verified que está en el token
    //ya esté en true (O sea qu haya pasado por el paso 2)
    const token = req.cookies.recoveryCookie;
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (!decoded.verified) {
      return res.status(400).json({ message: "Código no verificado" });
    }

    //Encriptar la contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    //Actualizar la contraseña en la base de datos
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
    // Leemos el email desde la cookie anterior, no del body
    // así el usuario no tiene que volver a ingresarlo
    const token = req.cookies.recoveryCookie;

    if (!token) {
      return res.status(400).json({ message: "No se encontró una sesión de recuperación activa" });
    }

    const decoded = jsonwebtoken.verify(token, config.JWT.secret);
    const email = decoded.email;

    // Verificamos que el usuario siga existiendo
    const userFound = await adminModel.findOne({ email });
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generamos un nuevo código aleatorio
    const randomCode = crypto.randomBytes(3).toString("hex");

    // Creamos un nuevo token — esto invalida el anterior automáticamente
    // porque la cookie se sobreescribe con el nuevo valor
    const newToken = jsonwebtoken.sign(
      { email, randomCode, userType: "admin", verified: false },
      config.JWT.secret,
      { expiresIn: "15m" }
    );

    // Sobreescribimos la cookie — el código anterior queda invalidado
    res.cookie("recoveryCookie", newToken, { maxAge: 30 * 60 * 1000 });

    // Enviamos el nuevo código por correo
    const htmlContent = HTMLRecoveryEmail(randomCode);

    try {
      await sendEmail(email, "Recuperación de contraseña - Nuevo código", htmlContent);
    } catch (error) {
      console.log("error" + error);
      return res.status(500).json({ message: "Error al enviar el correo" });
    }
    return res.status(200).json({ message: "Código reenviado correctamente" });

  } catch (error) {
    // Si el token expiró, la cookie ya no es válida
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
    }
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default recoveryPasswordAdminController;