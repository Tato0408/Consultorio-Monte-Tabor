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
        const {
            name, last_name, dui, age,
            gender, email, password,
        } = req.body;

        // Validar que no exista ya un admin
        const adminCount = await adminModel.countDocuments();
        if (adminCount > 0) {
            return res.status(400).json({ message: "An admin already exists in the system" });
        }

        // Validar que llegó la imagen
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        const passwordHashed = await bcryptjs.hash(password, 10);

        const newAdmin = new adminModel({
            name,
            last_name,
            dui,
            age,
            gender,
            email,
            password: passwordHashed,
            image: req.file.path,
            public_id: req.file.filename,
            is_active: true,
            is_verified: true,
            loginAttempts: 0,
        });

        await newAdmin.save();

        return res.status(201).json({ message: "Admin registered successfully" });

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