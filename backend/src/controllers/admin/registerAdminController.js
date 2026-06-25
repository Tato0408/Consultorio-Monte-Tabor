import nodemailer from "nodemailer";
import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import adminModel from "../../models/admin/admins.js";
import { config } from "../../../config.js";
import { v2 as cloudinary } from "cloudinary";

const registerAdminController = {};

registerAdminController.register = async (req, res) => {
    try {

        //#1- Solicitar los datos
        const {
            name,
            last_name,
            dui,
            age,
            gender,
            email,
            password,
            is_active,
            is_verified,
            loginAttempts,
            timeOut,
        } = req.body;

        //#2- Validar que no exista ya un admin en el sistema
        const adminCount =
            await adminModel.countDocuments();

        if (adminCount > 0) {
            return res.status(400).json({ message: "An admin already exists in the system" });
        }

        //Encriptamos la contraseña
        const passwordHashed = await bcryptjs.hash(password, 10);

        //Generamos el codigo
        const randomCode = crypto.randomBytes(3).toString("hex");

        // Guardamos en constantes  la imagen para poder eliminarla si no se verifica
        const uploadedImagePath = req.file.path;
        const uploadedImagePublicId = req.file.filename;

        const token = jsonwebtoken.sign(
            {
                randomCode,
                image: uploadedImagePath,
                public_id: uploadedImagePublicId,
                email,
                password: passwordHashed,
                name,
                last_name,
                dui,
                age,
                gender,
                is_active,
                is_verified,
                loginAttempts,
                timeOut,
            },
            config.JWT.secret,
            {
                expiresIn: "15m",
            },
        );
        res.cookie("registrationCookie", token, { maxAge: 15 * 60 * 1000 });

        //funcion asyncrona para poder borrar la imagen de cloudinary si no se verifica el admin
        setTimeout(async () => {
            try {
                const adminAlreadyCreated = await adminModel.findOne({ public_id: uploadedImagePublicId });

                // Si nadie usó esta imagen para crear un admin, se borra de Cloudinary
                if (!adminAlreadyCreated) {
                    await cloudinary.uploader.destroy(uploadedImagePublicId,);

                    console.log("Imagen seleccionada eliminada " + uploadedImagePublicId);
                }
            } catch (error) {
                console.log("Error eliminando la imagen " + error);
            }
        },
            //aqui definimos que el metodo durara 15 minutos que es el tiempo de vida para verificar el usuario
            15 * 60 * 1000);

        const transporter =
            nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: config.email.user_email,
                    pass: config.email.user_password,
                },
            });

        const mailOptions = {
            from: config.email.user_email,
            to: email,
            subject: "Verificación de cuenta",
            text:
                "Para verificar tu cuenta utiliza este código: " +
                randomCode +
                " Expira en 15 minutos.",
        };

        transporter.sendMail(
            mailOptions,
            (error, info) => {
                if (error) {
                    console.log("error " + error);
                    return res.status(500).json({ message: "Error sending email" });
                }
                return res.status(200).json({ message: "Verification email sent" });
            },
        );
    } catch (error) {
        console.log("error " + error);

        return res.status(500).json({ message: "Internal server error" });
    }
};

//Verificar codigo
registerAdminController.verifyCode =
    async (req, res) => {

        try {
            const { verificationCodeRequest } = req.body;

            const token = req.cookies.registrationCookie;

            const decoded = jsonwebtoken.verify(token, config.JWT.secret);

            const {
                randomCode: storedCode,
                image,
                public_id,
                name,
                last_name,
                dui,
                age,
                gender,
                email,
                password,
                is_active,
                is_verified,
                loginAttempts,
                timeOut,
            } = decoded;

            if (
                verificationCodeRequest !==
                storedCode
            ) {
                //Se borra la imagen ya que no se completará el registro
                await cloudinary.uploader.destroy(public_id);

                return res.status(400).json({ message: "Invalid code" });
            }

            //Validar que no exista un admin antes
            const adminCount = await adminModel.countDocuments();

            if (adminCount > 0) {
                //Se borra la imagen ya que no se completará el registro
                await cloudinary.uploader.destroy(public_id);

                return res.status(400).json({ message: "An admin already exists in the system" });
            }

            // CREAR ADMIN
            const newAdmin =
                new adminModel({
                    image,
                    public_id,
                    name,
                    last_name,
                    dui,
                    age,
                    gender,
                    email,
                    password,
                    is_active: true,
                    is_verified: true,
                    loginAttempts,
                    timeOut,
                });

            await newAdmin.save();

            res.clearCookie("registrationCookie");
            return res.status(200).json({ message: "Admin registered" });
        } catch (error) {
            console.log("error " + error);
            return res.status(500).json({ message: "Internal server error" });
        }
    };
export default registerAdminController