import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import adminModel from "../../models/admin/admins.js";
import { config } from "../../../config.js";
import { v2 as cloudinary } from "cloudinary";
import { findStaffDuplicate, getMissingRequiredField, validateUserFieldFormats } from "../../utils/validators.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

const registerAdminController = {};

registerAdminController.register = async (req, res) => {
    try {
        const {
            name, last_name, dui, birth_date,
            gender, email, password,
        } = req.body;

        // Validar que no exista ya un admin
        const adminCount = await adminModel.countDocuments();
        if (adminCount > 0) {
            return res.status(400).json({ message: "Ya existe un administrador en el sistema" });
        }

        //Valida que ningun campo obligatorio venga vacio
        const requiredError = getMissingRequiredField(
            { name, last_name, dui, birth_date, gender, email, password },
            ["name", "last_name", "dui", "birth_date", "gender", "email", "password"]
        );
        if (requiredError) {
            return res.status(400).json({ message: requiredError });
        }

        //Valida el formato de los campos y que la fecha de nacimiento corresponda a un mayor de edad
        const formatError = validateUserFieldFormats({ name, last_name, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        // Validar que llegó la imagen
        if (!req.file) {
            return res.status(400).json({ message: "La imagen es requerida" });
        }

        //Busca si el correo o el DUI ya están en uso por CUALQUIER rol de staff (admin, doctor,
        //enfermera o recepcionista)
        const staffDuplicate = await findStaffDuplicate(email, dui);
        if (staffDuplicate) {
            return res.status(400).json(staffDuplicate);
        }

        const passwordHashed = await bcryptjs.hash(password, 10);

        // Igual que el registro de doctor: no se crea la cuenta todavía, se manda un
        // código de verificación al correo declarado y solo verifyCode (con el código
        // correcto) la crea de verdad. Antes este endpoint activaba la cuenta de
        // administrador (con acceso total al sistema) con un solo POST público, sin
        // confirmar que quien lo llamó controla ese correo.
        const randomCode = crypto.randomBytes(3).toString("hex");

        const token = jsonwebtoken.sign(
            {
                randomCode,
                image: req.file.path,
                public_id: req.file.filename,
                name,
                last_name,
                dui,
                birth_date,
                gender,
                email,
                password: passwordHashed,
                is_active: true,
                is_verified: true,
                loginAttempts: 0,
            },
            config.JWT.secret,
            { expiresIn: "15m" }
        );

        res.cookie("registrationCookie", token, {
            maxAge: 15 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        const htmlContent = "Para verificar tu cuenta utiliza este código: " + randomCode + ". Expira en 15 minutos.";

        try {
            await sendEmail(email, "Verificación de cuenta", htmlContent);
        } catch (error) {
            console.log("error " + error);
            return res.status(500).json({ message: "Error al enviar el correo" });
        }

        return res.status(200).json({ message: "Correo de verificación enviado" });

    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
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
                birth_date,
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

                return res.status(400).json({ message: "Código inválido" });
            }

            //Validar que no exista un admin antes
            const adminCount = await adminModel.countDocuments();

            if (adminCount > 0) {
                //Se borra la imagen ya que no se completará el registro
                await cloudinary.uploader.destroy(public_id);

                return res.status(400).json({ message: "Ya existe un administrador en el sistema" });
            }

            //Busca si el correo o el DUI ya están en uso por CUALQUIER rol de staff (admin, doctor,
            //enfermera o recepcionista)
            const staffDuplicate = await findStaffDuplicate(email, dui);
            if (staffDuplicate) {
                //Se borra la imagen ya que no se completará el registro
                await cloudinary.uploader.destroy(public_id);

                return res.status(400).json(staffDuplicate);
            }

            // CREAR ADMIN
            const newAdmin =
                new adminModel({
                    image,
                    public_id,
                    name,
                    last_name,
                    dui,
                    birth_date,
                    gender,
                    email,
                    password,
                    is_active: true,
                    is_verified: true,
                    loginAttempts,
                    timeOut,
                });

            try {
                await newAdmin.save();
            } catch (saveError) {
                // El countDocuments() de arriba no es atómico: dos verificaciones
                // concurrentes podían pasarlo antes de que ninguna hubiera guardado
                // todavía. El índice único de "singleton" (ver el modelo) es la
                // garantía real — si otra petición ya ganó la carrera, este .save()
                // revienta con un error de llave duplicada (E11000) en vez de crear
                // un segundo administrador.
                if (saveError?.code === 11000) {
                    await cloudinary.uploader.destroy(public_id);
                    return res.status(400).json({ message: "Ya existe un administrador en el sistema" });
                }
                throw saveError;
            }

            res.clearCookie("registrationCookie");
            return res.status(200).json({ message: "Administrador registrado" });
        } catch (error) {
            console.log("error " + error);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    };
export default registerAdminController