import nursesModel from "../../models/nurses/nurses.js"
import appointmentsModel from "../../models/appointments/appointments.js"
import proceduresModel from "../../models/procedures/procedures.js"
import nurseNotesModel from "../../models/nurse_notes/nurse_notes.js"
import { v2 as cloudinary } from "cloudinary"
import * as nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import { config } from "../../../config.js"
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError, findStaffDuplicate } from "../../utils/validators.js"
const nursesController = {}

nursesController.getAllNurses = async (req, res) => {
    try {
        const response = await nursesModel.find();
        if (!response) {
            return res.status(404).json({ message: "Nurse not found" });
        }
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

nursesController.countNurses = async (req, res) => {
    try {
        const count = await nursesModel.countDocuments();
        return res.status(200).json({ count });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

// Asumiendo que tu controlador se llama nurseNotesController y tu modelo nurseNotesModel
nursesController.countNotes = async (req, res) => {
    try {
        const count = await nurseNotesModel.countDocuments();
        return res.status(200).json({ count });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

nursesController.countAppointments = async (req, res) => {
    try {
        // Ajusta "completed" al estado real que uses en tu base de datos para citas atendidas
        const count = await appointmentsModel.countDocuments({ status: "completed" });
        return res.status(200).json({ count });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

nursesController.countProcedures = async (req, res) => {
    try {
        const count = await proceduresModel.countDocuments();
        return res.status(200).json({ count });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
nursesController.insertNurses = async (req, res) => {
    try {
        let {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password
        } = req.body;

        //Valida que ningun campo obligatorio venga vacio (se hace antes de tocar la base de
        //datos, para no gastar una consulta si la peticion ya viene incompleta)
        const requiredError = getMissingRequiredField(
            { name, last_name, dui, phone, birth_date, email, password },
            ["name", "last_name", "dui", "phone", "birth_date", "email", "password"]
        );
        if (requiredError) {
            return res.status(400).json({ message: requiredError });
        }

        //Sanitización de campos
        name = name?.trim()
        last_name = last_name?.trim()
        dui = dui?.trim()
        phone = phone?.trim()
        birth_date = birth_date?.trim()
        email = email?.trim()
        password = password?.trim()

        //Valida el formato de telefono/correo/DUI (misma regla que las mascaras del frontend)
        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        //Valida que la contraseña cumpla los requisitos de seguridad (incluye el caracter
        //especial real, a diferencia de la validación anterior que comparaba contra alfanumérico)
        const passwordError = getPasswordError(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        //La foto de perfil es obligatoria al crear una enfermera, igual que en el resto del
        //staff — se valida aquí explícitamente para devolver un mensaje claro
        if (!req.file) {
            return res.status(400).json({ message: "La foto de perfil es requerida" });
        }

        //Busca si el correo o el DUI ya están en uso por CUALQUIER rol de staff (admin, doctor,
        //enfermera o recepcionista) — no solo dentro de la colección de enfermeras
        const staffDuplicate = await findStaffDuplicate(email, dui);
        if (staffDuplicate) {
            return res.status(400).json(staffDuplicate);
        }

        const passwordHashed = await bcrypt.hash(password, 10)

        let payload = new nursesModel({
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password: passwordHashed,
            is_active: true,
            is_verified: false,
            // La presencia del archivo ya se validó arriba antes de llegar aquí
            img_url: req.file?.path,
            public_id: req.file?.filename,
            time_out: null
        })
        const savedNurse = await payload.save()
        if (!savedNurse) {
            return res.status(500).json({ message: "Error while adding a nurse" })
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: config.email.user_email,
                pass: config.email.user_password
            }
        });

        const mailOptions = {
            from: config.email.user_email,
            to: email,
            subject: `Su cuenta de enfermera ha sido creada`,
            text: `Hola ${name} ${last_name}, su cuenta con el rol de enfermera ha sido creada exitosamente.
                Correo: ${email}
                Contraseña: ${password}
                Inicie sesión por primera vez dentro del sistema para cambiar su contraseña.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent: " + info.response);
            }
        });
        return res.status(200).json({ message: "Nurse added succesfuly" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

nursesController.deleteNurse = async (req, res) => {
    try {

        const response = await nursesModel.findById(req.params.id)
        const deleteImage = await cloudinary.uploader.destroy(response.public_id)
        if (!response) {
            return res.status(404).json({ message: "Nurse not found" })
        }
        if (!deleteImage) {
            const error = new Error("Error while deleting a nurse");
            return res.status(500).json({ message: "Internal Server error", error: error.message })
        }
        const nurseDeleted = await nursesModel.findByIdAndDelete(req.params.id)
        if(!nurseDeleted){
                const error = new Error("Error deleting a nurse");
                return res.status(500).json({message: "Internal Server error", error: error.message})
            }
        return res.status(200).json({ message: "Nurse deleted succesfuly" })
    } catch (error) {
        console.log(error)
        return res.staus(500).json({ message: "Internal Server error" })
    }
}

nursesController.updateNurse = async(req,res) => {
    try {
        let{
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password,
            is_active,
            time_out
        } = req.body

        const response = await nursesModel.findById(req.params.id)
        if(!response){
            return res.status(404).json({message: "Nurse not found"})
        }

        //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
        //romper actualizaciones parciales)
        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        let payload = {
             name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password: response.password,
            is_active,
            is_verified: response.is_verified,
            time_out: response.time_out
        }

        // Si viene una nueva contraseña, la validamos y encriptamos antes de guardar.
        // Por defecto se mantiene la actual (arriba), así que esto solo pisa el campo
        // cuando realmente se pidió cambiarla.
        if (password && password.trim() !== "") {
            const passwordError = getPasswordError(password);
            if (passwordError) {
                return res.status(400).json({ message: passwordError });
            }
            // Compara contra el hash actual para no permitir "cambiarla" por la misma de siempre
            const samePassword = await bcrypt.compare(password, response.password);
            if (samePassword) {
                return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
            }
            payload.password = await bcrypt.hash(password, 10);
        }
        if(req.file){
            const updateImage = await cloudinary.uploader.destroy(response.public_id)
            if(!updateImage){
                const error = new Error("Error updating a nurse");
                return res.status(500).json({message: "Internal Server error", error: error.message})
            }
            payload.img_url = req.file.path
            payload.public_id = req.file.filename
        }
        const nurseUpdated = await nursesModel.findByIdAndUpdate(req.params.id, payload, { new: true })
        if(!nurseUpdated){
            const error = new Error("Error updatinf a nurse");
            return res.status(500).json({message: "Internal Server error", error: error.message})
        }
        return res.status(200).json({message: "Nurse updates succesfuly", nurse: nurseUpdated})
    } catch (error) {
        console.log("Error: ", error)
        return res.status(500).json({message: "Internal Server error"})
    }
}

nursesController.updateOwnProfile = async (req, res) => {
    try {
        const nurseId = req.user.id;

        // Buscamos a la enfermera en la base de datos
        const nurseFound = await nursesModel.findById(nurseId);
        if (!nurseFound) {
            return res.status(404).json({ message: "Nurse profile not found" });
        }

        // Excluimos 'is_active', 'is_verified', 'password' y 'time_out' por seguridad.
        const {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email
        } = req.body;

        const payload = {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password: nurseFound.password, // Mantenemos la contraseña actual intacta
            is_active: nurseFound.is_active,
            is_verified: nurseFound.is_verified,
            time_out: nurseFound.time_out
        };

        if (req.file) {
            // Borramos la imagen anterior solo si tiene un public_id registrado
            if (nurseFound.public_id) {
                await cloudinary.uploader.destroy(nurseFound.public_id);
            }
            
            payload.img_url = req.file.path;
            payload.public_id = req.file.filename;
        }

        // Actualizamos el perfil de la enfermera autenticada
        const nurseUpdated = await nursesModel.findByIdAndUpdate(nurseId, payload, { new: true }).select("-password");
        if (!nurseUpdated) {
            return res.status(500).json({ message: "Error updating your profile" });
        }

        return res.status(200).json({ 
            message: "Your profile has been updated successfully", 
            user: nurseUpdated 
        });

    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ message: "Internal Server error updating your profile" });
    }
};

export default nursesController;