import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { sendEmail } from "../../utils/sendMailMailjet.js";
import HTMLRecoveryEmail from "../../utils/HTMLsendRecoveryPassword.js";
import { getPasswordError } from "../../utils/validators.js";
import { config } from "../../../config.js";

import adminModel from "../../models/admin/admins.js";
import doctorModel from "../../models/doctors/doctors.js";
import nurseModel from "../../models/nurses/nurses.js";
import receptionistModel from "../../models/receptionist/receptionist.js";

// Reemplaza a los 4 controladores de recuperación de staff (admin, doctor, enfermera,
// recepcionista), que antes eran endpoints separados por rol. El formulario "Olvidé mi
// contraseña" del panel privado es uno solo, sin que el usuario declare su rol, así que
// antes probaba los 4 endpoints en secuencia y usaba el 404 "Usuario no encontrado" de
// cada uno para decidir "prueba el siguiente rol" — eso mismo permitía a cualquiera, sin
// sesión, enumerar por API directa exactamente qué rol tiene cada correo (200 si existe
// en esa colección, 404 si no). Este controlador revisa las 4 colecciones en una sola
// petición y SIEMPRE responde el mismo mensaje genérico, exista o no la cuenta.
const ROLE_MODELS = {
    admin: adminModel,
    doctor: doctorModel,
    nurse: nurseModel,
    receptionist: receptionistModel,
};

const GENERIC_MESSAGE = "Si el correo está registrado, te enviaremos un código de verificación.";

const staffRecoveryController = {};

staffRecoveryController.requestCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "El correo es requerido" });
        }

        const entries = Object.entries(ROLE_MODELS);
        const results = await Promise.all(entries.map(([, model]) => model.findOne({ email })));
        const matchIndex = results.findIndex((result) => result !== null);

        // Si no hay coincidencia en ninguna colección, no se genera cookie ni se manda
        // correo, pero la respuesta es idéntica a la de un correo que sí existe.
        if (matchIndex !== -1) {
            const [userType] = entries[matchIndex];
            const randomCode = crypto.randomBytes(3).toString("hex");

            const token = jsonwebtoken.sign(
                { email, randomCode, userType, verified: false },
                config.JWT.secret,
                { expiresIn: "15m" },
            );

            res.cookie("recoveryCookie", token, {
                maxAge: 15 * 60 * 1000,
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });

            const htmlContent = HTMLRecoveryEmail(randomCode);
            try {
                await sendEmail(email, "Recuperación de contraseña", htmlContent);
            } catch (error) {
                // No se revela si el correo existía ni que el envío falló: mismo mensaje
                // genérico. El intento queda en el log del servidor para diagnóstico.
                console.log("Error enviando correo de recuperación:", error);
            }
        }

        return res.status(200).json({ message: GENERIC_MESSAGE });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

staffRecoveryController.verifyCode = async (req, res) => {
    try {
        const { code } = req.body;
        const token = req.cookies.recoveryCookie;

        let decoded;
        try {
            decoded = jsonwebtoken.verify(token, config.JWT.secret);
        } catch {
            return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
        }

        if (code !== decoded.randomCode) {
            return res.status(400).json({ message: "Código inválido" });
        }

        const newToken = jsonwebtoken.sign(
            { email: decoded.email, userType: decoded.userType, verified: true },
            config.JWT.secret,
            { expiresIn: "15m" },
        );

        res.cookie("recoveryCookie", newToken, {
            maxAge: 15 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return res.status(200).json({ message: "Código verificado correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

staffRecoveryController.newPassword = async (req, res) => {
    try {
        const { newPassword, confirmNewPassword } = req.body;

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "Las contraseñas no coinciden" });
        }

        // Antes ningún paso de "Olvidé mi contraseña" exigía la misma complejidad que el
        // registro: se podía recuperar una cuenta y dejarla con una contraseña de un
        // solo carácter.
        const passwordError = getPasswordError(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const token = req.cookies.recoveryCookie;
        let decoded;
        try {
            decoded = jsonwebtoken.verify(token, config.JWT.secret);
        } catch {
            return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
        }

        if (!decoded.verified) {
            return res.status(400).json({ message: "Código no verificado" });
        }

        const Model = ROLE_MODELS[decoded.userType];
        if (!Model) {
            return res.status(400).json({ message: "Solicitud inválida" });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await Model.findOneAndUpdate(
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

staffRecoveryController.resendCode = async (req, res) => {
    try {
        const token = req.cookies.recoveryCookie;
        if (!token) {
            return res.status(400).json({ message: "No se encontró una sesión de recuperación activa" });
        }

        let decoded;
        try {
            decoded = jsonwebtoken.verify(token, config.JWT.secret);
        } catch {
            return res.status(401).json({ message: "La sesión de recuperación expiró, vuelve a empezar" });
        }

        const Model = ROLE_MODELS[decoded.userType];
        const userFound = Model ? await Model.findOne({ email: decoded.email }) : null;
        if (!userFound) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const randomCode = crypto.randomBytes(3).toString("hex");
        const newToken = jsonwebtoken.sign(
            { email: decoded.email, randomCode, userType: decoded.userType, verified: false },
            config.JWT.secret,
            { expiresIn: "15m" },
        );

        res.cookie("recoveryCookie", newToken, {
            maxAge: 15 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        const htmlContent = HTMLRecoveryEmail(randomCode);
        try {
            await sendEmail(decoded.email, "Recuperación de contraseña - Nuevo código", htmlContent);
        } catch (error) {
            console.log("error" + error);
            return res.status(500).json({ message: "Error al enviar el correo" });
        }

        return res.status(200).json({ message: "Código reenviado correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default staffRecoveryController;
