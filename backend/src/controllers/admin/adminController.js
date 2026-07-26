import adminModel from "../../models/admin/admins.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../config.js";
import bcrypt from "bcryptjs";
import { validateUserFieldFormats } from "../../utils/validators.js";

//Array de funciones
const adminController = {};

//Get
adminController.getAdmins = async (req, res) => {
    try {
        const admins = await adminModel.find();
        const adminCount = await adminModel.countDocuments();
        if (adminCount === 0) {
            return res.status(404).json({ message: "No admins found" });
        }
        return res.status(200).json(admins);
    } catch (error) {
        console.log("error " + error);

        return res.status(500).json({ message: "Internal server error" });
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
            return res.status(404).json({ message: "Admin not found" });
        }

        //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
        //romper actualizaciones parciales), incluyendo que la fecha de nacimiento sea de un mayor de edad
        const formatError = validateUserFieldFormats({ name, last_name, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        const passwordHashed = await bcrypt.hash(password, 10);
        const updatedData = {
            name,
            last_name,
            dui,
            birth_date,
            gender,
            password: passwordHashed,
            is_active,
            is_verified,
        };

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
            return res.status(200).json({ message: "Admin updated" })
        }

        //#1 si el correo es diferente hay que verificarlo antes de actualizarlo

        //validar que el correo no este en uso
        const emailInUse = await adminModel.findOne({ email });

        if (emailInUse) {
            return res.status(400).json({ message: "Email already in use" });
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
            subject: "Verificación de cambio de correo",
            text:
                "Para confirmar tu nuevo correo utiliza este código: " +
                randomCode +
                ". Expira en 15 minutos.",
        };

        await transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log("error " + error);

                return res.status(500).json({ message: "Error sending email" });
            }
        });

        return res.status(200).json({ message: "Admin updated" });

    } catch (error) {
        console.log("error:", error);
        return res.status(500).json({ message: "Internal server error" });
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
            return res.status(400).json({ message: "Invalid code" });
        }

        await adminModel.findByIdAndUpdate(
            admin_id,
            { email: newEmail },
            { new: true },
        );

        res.clearCookie("emailChangeCookie");

        return res.status(200).json({ message: "Email updated" });

    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


adminController.deleteAdmin = async (req, res) => {
    try {

        const adminFound =
            await adminModel.findById(req.params.id);

        if (!adminFound) {
            return res.status(404).json({ message: "Admin not found" });
        }

        //Borrar la imagen
        await cloudinary.uploader.destroy(adminFound.public_id,);

        await adminModel.findByIdAndDelete(req.params.id,);

        return res.status(200).json({ message: "Admin deleted" });

    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

adminController.checkAdminExists = async (req, res) => {
    try {
        const count = await adminModel.countDocuments();
        return res.status(200).json({ exists: count > 0 });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default adminController;