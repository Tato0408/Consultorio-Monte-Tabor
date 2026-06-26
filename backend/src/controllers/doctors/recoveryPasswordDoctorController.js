import jsonwebtoken from "jsonwebtoken"; //Generar tokens
import bcrypt from "bcryptjs"; //Encriptar la contraseña
import crypto from "crypto"; //Generar códigos aleatorios
import nodemailer from "nodemailer"; //Enviar correos

import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";

import { config } from "../../../config.js";

import doctorModel from "../../models/doctors/doctors.js";

//Array de funciones
const recoveryPasswordController = {};

recoveryPasswordController.requestCode = async (req, res) => {
  try {
    //#1- Solicitamos los datos
    const { email } = req.body;
    console.log(req.body);
console.log(email);

    //Validar que el correo si exista en la bd
    const userFound = await doctorModel.findOne({ email });

    if (!userFound) {
      return res.status(404).json({ message: "User not found" });
    }

    //Generamos un código aleatorio
    const randomCode = crypto.randomBytes(3).toString("hex");

    //Guardamos todo en un token
    const token = jsonwebtoken.sign(
      //#1- ¿Qué vamos a guardar?
      { email, randomCode, userType: "doctor", verified: false },
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
        return res.status(500).json({ message: "Error sending mail" });
      }
      return res.status(200).json({ message: "email sent" });
    });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

recoveryPasswordController.verifyCode = async (req, res) => {
  try {
    //#1- Solicitamos los datos
    const { code } = req.body;

    //Obtenemos la información que está dentro del token
    //Accedemos a la cookie
    const token = req.cookies.recoveryCookie;
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    console.log("Código recibido:", code);
    console.log("Código guardado:", decoded.randomCode);

    //Ahora, comparar el código que el usuario escribió
    //con el que está guardado en el token
    if (code !== decoded.randomCode) {
      return res.status(400).json({ message: "Invalid code" });
    }

    //En cambio, si escribe bien el código
    //vamos a colocar en el token que ya está verificado
    const newToken = jsonwebtoken.sign(
      //#1- ¿Qué vamos a guardar?
      { email: decoded.email, userType: "doctor", verified: true },
      //#2- Secret key
      config.JWT.secret,
      //#3- ¿Cúando expira?
      { expiresIn: "15m" },
    );

    res.cookie("recoveryCookie", newToken, { maxAge: 15 * 60 * 1000 });

    return res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

recoveryPasswordController.newPassword = async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;

    //Comparo las dos contraseñas
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Password doesnt match" });
    }

    //Vamos a comprobar que la constante verified que está en el token
    //ya esté en true (O sea qu haya pasado por el paso 2)
    const token = req.cookies.recoveryCookie;
    const decoded = jsonwebtoken.verify(token, config.JWT.secret);

    if (!decoded.verified) {
      return res.status(400).json({ message: "Code not verified" });
    }

    //////////
    //Encriptar la contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    //Actualizar la contraseña en la base de datos
    await doctorModel.findOneAndUpdate(
      { email: decoded.email },
      { password: passwordHash },
      { new: true },
    );

    res.clearCookie("recoveryCookie");

    return res.status(200).json({ message: "Password updated" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default recoveryPasswordController;

