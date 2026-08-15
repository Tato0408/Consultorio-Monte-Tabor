import adminModel from "../../models/admin/admins.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../config.js";
import bcrypt from "bcryptjs";
import { validateUserFieldFormats, getPasswordError } from "../../utils/validators.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

//Array de funciones
const adminController = {};

//Get
adminController.getAdmins = async (req, res) => {
    try {
        const admins = await adminModel.find();
        const adminCount = await adminModel.countDocuments();
        if (adminCount === 0) {
            return res.status(404).json({ message: "No se encontraron administradores" });
        }
        return res.status(200).json(admins);
    } catch (error) {
        console.log("error " + error);

        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

//UPDATE
adminController.updateAdmin = async (req, res) => {
    try {
        const {
            name,
            last_name,
            dui,
            birth_date,
            gender,
            email,
            password,
            is_active,
            is_verified,
        } = req.body;

        const adminFound = await adminModel.findById(req.params.id);

        if (!adminFound) {
            return res.status(404).json({ message: "Administrador no encontrado" });
        }

        //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
        //romper actualizaciones parciales), incluyendo que la fecha de nacimiento sea de un mayor de edad
        const formatError = validateUserFieldFormats({ name, last_name, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        const updatedData = {
            name,
            last_name,
            dui,
            birth_date,
            gender,
            is_active,
            is_verified,
        };

        // Si viene una nueva contraseña, la validamos y encriptamos antes de guardar. Antes esto
        // se hacía sin condición, así que CUALQUIER edición sin contraseña (ej. solo cambiar el
        // nombre) terminaba hasheando "undefined" y dejaba al admin sin poder volver a iniciar sesión.
        if (password && password.trim() !== "") {
            const passwordError = getPasswordError(password);
            if (passwordError) {
                return res.status(400).json({ message: passwordError });
            }
            // Compara contra el hash actual para no permitir "cambiarla" por la misma de siempre
            const samePassword = await bcrypt.compare(password, adminFound.password);
            if (samePassword) {
                return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
            }
            updatedData.password = await bcrypt.hash(password, 10);
        }

        //Nueva imagen
        if (req.file) {
            // Solo destruir si existía una imagen previa
            if (adminFound.public_id) {
                await cloudinary.uploader.destroy(adminFound.public_id);
            }
            updatedData.image = req.file.path;
            updatedData.public_id = req.file.filename;
        } else if (req.body.image === null || req.body.image === "null") {
            if (adminFound.public_id) {
                await cloudinary.uploader.destroy(adminFound.public_id);
            }
            updatedData.image = null;
            updatedData.public_id = null;
        }

        await adminModel.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true },
        );

        //En caso quiera actualizar el correo 

        //Si el correo es el mismo, no hay mas que hacer
        if (!email || email === adminFound.email) {
            return res.status(200).json({ message: "Administrador actualizado" })
        }

        //#1 si el correo es diferente hay que verificarlo antes de actualizarlo

        //validar que el correo no este en uso
        const emailInUse = await adminModel.findOne({ email });

        if (emailInUse) {
            return res.status(400).json({ message: "El correo ya está en uso" });
        }

        //Generamos un codigo
        const randomCode = crypto.randomBytes(3).toString("hex");

        //Guardamos en el token el id del admin, el nuevo correo y el codigo generado
        const token = jsonwebtoken.sign(
            {
                admin_id: req.params.id,
                newEmail: email,
                randomCode,
            },
            config.JWT.secret,
            { expiresIn: "15m" },
        );

        res.cookie("emailChangeCookie", token, { maxAge: 15 * 60 * 1000 });

        //Enviamos el código al nuevo correo
        const htmlContent =
            "Para confirmar tu nuevo correo utiliza este código: " +
            randomCode +
            ". Expira en 15 minutos.";

        try {
            await sendEmail(email, "Verificación de cambio de correo", htmlContent);
        } catch (error) {
            console.log("error " + error);

            return res.status(500).json({ message: "Error al enviar el correo" });
        }

        return res.status(200).json({ message: "Administrador actualizado" });

    } catch (error) {
        console.log("error:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

//Verificacion de cambio de correo
adminController.verifyEmailChange = async (req, res) => {
    try {
        const { verificationCodeRequest } = req.body;

        const token = req.cookies.emailChangeCookie;

        const decoded = jsonwebtoken.verify(token, config.JWT.secret);

        const { admin_id, newEmail, randomCode: storedCode } = decoded;

        if (verificationCodeRequest !== storedCode) {
            return res.status(400).json({ message: "Código inválido" });
        }

        await adminModel.findByIdAndUpdate(
            admin_id,
            { email: newEmail },
            { new: true },
        );

        res.clearCookie("emailChangeCookie");

        return res.status(200).json({ message: "Correo actualizado" });

    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}


adminController.deleteAdmin = async (req, res) => {
    try {

        const adminFound =
            await adminModel.findById(req.params.id);

        if (!adminFound) {
            return res.status(404).json({ message: "Administrador no encontrado" });
        }

        //Borrar la imagen
        await cloudinary.uploader.destroy(adminFound.public_id,);

        await adminModel.findByIdAndDelete(req.params.id,);

        return res.status(200).json({ message: "Administrador eliminado" });

    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

adminController.checkAdminExists = async (req, res) => {
    try {
        const count = await adminModel.countDocuments();
        return res.status(200).json({ exists: count > 0 });
    } catch (error) {
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default adminController;