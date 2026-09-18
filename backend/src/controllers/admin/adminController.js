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
        // Nunca se envía el hash de la contraseña al cliente (mismo criterio que
    // doctorsController/receptionistController). Antes exponía el hash bcrypt de
    // cada administrador a cualquier otro admin que abriera este listado.
    const admins = await adminModel.find().select("-password");
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
        // Solo el propio admin puede editar su cuenta. Antes cualquier admin
        // autenticado podía editar (o, peor, borrar) la cuenta de otro admin
        // con solo conocer su _id. Como el sistema solo permite un
        // administrador a la vez (ver registerAdminController), esto es hoy
        // una defensa en profundidad, no un caso que se pueda dar sin editar
        // la base de datos a mano.
        if (String(req.params.id) !== String(req.user.id)) {
            return res.status(403).json({ message: "Solo puedes editar tu propia cuenta." });
        }

        const {
            name,
            last_name,
            dui,
            birth_date,
            gender,
            email,
            password,
            current_password,
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

        // Si viene una nueva contraseña, la valida y encripta antes
        // de guardar. Si se guardara sin esta condición, cualquier
        // edición sin contraseña (por ejemplo, solo cambiar el
        // nombre) terminaría hasheando undefined y dejaría al admin
        // sin poder volver a iniciar sesión.
        if (password && password.trim() !== "") {
            // Antes no se pedía la contraseña actual: una sesión comprometida
            // (XSS, computadora sin bloquear, cookie robada) bastaba para
            // tomar la cuenta cambiando la contraseña sin ninguna fricción.
            if (!current_password || !current_password.trim()) {
                return res.status(400).json({ message: "Debes ingresar tu contraseña actual." });
            }
            const currentMatches = await bcrypt.compare(current_password, adminFound.password);
            if (!currentMatches) {
                return res.status(400).json({ message: "La contraseña actual no es correcta." });
            }

            const passwordError = getPasswordError(password);
            if (passwordError) {
                return res.status(400).json({ message: passwordError });
            }
            // Compara contra el hash actual para no permitir
            // cambiarla por la misma contraseña de siempre.
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

        res.cookie("emailChangeCookie", token, {
            maxAge: 15 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: "none"
        });

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

        res.clearCookie("emailChangeCookie", {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        });

        return res.status(200).json({ message: "Correo actualizado" });

    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}


adminController.deleteAdmin = async (req, res) => {
    try {
        // Mismo criterio que updateAdmin: solo el propio admin puede
        // eliminar su cuenta, nunca la de otro.
        if (String(req.params.id) !== String(req.user.id)) {
            return res.status(403).json({ message: "Solo puedes eliminar tu propia cuenta." });
        }

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