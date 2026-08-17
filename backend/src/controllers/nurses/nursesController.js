import nursesModel from "../../models/nurses/nurses.js"
import appointmentsModel from "../../models/appointments/appointments.js"
import proceduresModel from "../../models/procedures/procedures.js"
import nurseNotesModel from "../../models/nurse_notes/nurse_notes.js"
import { v2 as cloudinary } from "cloudinary"
import bcrypt from 'bcryptjs'
import { config } from "../../../config.js"
import { sendEmail } from "../../utils/sendMailMailjet.js"
import HTMLStaffCredentials from "../../utils/HTMLStaffCredentials.js"
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError, findStaffDuplicate } from "../../utils/validators.js"
const nursesController = {}

nursesController.getAllNurses = async (req, res) => {
    try {
        const response = await nursesModel.find();
        if (!response) {
            return res.status(404).json({ message: "Enfermera no encontrada" });
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
        // Cuenta las citas cuyo estado es completed.
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

        //Valida el formato de teléfono, correo y DUI (misma regla que las máscaras del frontend)
        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        //Valida que la contraseña cumpla los requisitos de seguridad (incluye un carácter
        //especial real, no solo alfanumérico)
        const passwordError = getPasswordError(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        //La foto de perfil es obligatoria al crear una enfermera, igual que en el resto del
        //staff. Se valida aquí explícitamente para devolver un mensaje claro
        if (!req.file) {
            return res.status(400).json({ message: "La foto de perfil es requerida" });
        }

        //Busca si el correo o el DUI ya están en uso por cualquier rol de staff (admin, doctor,
        //enfermera o recepcionista), no solo dentro de la colección de enfermeras
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
            return res.status(500).json({ message: "Error al agregar la enfermera" })
        }
        sendEmail(
            email,
            "Tu cuenta de enfermera fue creada",
            HTMLStaffCredentials(`${name} ${last_name}`, "enfermera", email, password)
        ).catch((error) => console.log("Error enviando credenciales a la enfermera:", error));

        return res.status(200).json({ message: "Enfermera agregada correctamente" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

nursesController.deleteNurse = async (req, res) => {
    try {
        // Primero comprueba que la enfermera exista, para no llamar a
        // Cloudinary con un id ya borrado (por ejemplo, tras un doble
        // clic o una condición de carrera) y terminar con un error
        // genérico en vez de un 404 claro.
        const response = await nursesModel.findById(req.params.id)
        if (!response) {
            return res.status(404).json({ message: "Enfermera no encontrada" })
        }
        // No todas las enfermeras tienen foto guardada (public_id puede venir vacío).
        if (response.public_id) {
            const deleteImage = await cloudinary.uploader.destroy(response.public_id)
            if (!deleteImage) {
                const error = new Error("Error while deleting a nurse");
                return res.status(500).json({ message: "Error interno del servidor", error: error.message })
            }
        }
        const nurseDeleted = await nursesModel.findByIdAndDelete(req.params.id)
        if(!nurseDeleted){
                const error = new Error("Error deleting a nurse");
                return res.status(500).json({message: "Error interno del servidor", error: error.message})
            }
        return res.status(200).json({ message: "Enfermera eliminada correctamente" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error interno del servidor" })
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
            return res.status(404).json({message: "Enfermera no encontrada"})
        }

        //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
        //romper actualizaciones parciales)
        const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
        if (formatError) {
            return res.status(400).json({ message: formatError });
        }

        // Mismo chequeo que ya hacen doctores y recepcionistas al editar: si el correo o DUI
        // editado ya lo usa otro miembro del staff, se avisa con un mensaje claro en vez de
        // reventar contra el índice único de Mongo con un 500 genérico. excludeId es la propia
        // enfermera, para no chocar contra sí misma.
        if (email || dui) {
            const staffDuplicate = await findStaffDuplicate(email, dui, req.params.id);
            if (staffDuplicate) {
                return res.status(400).json(staffDuplicate);
            }
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

        // Si viene una nueva contraseña, la valida y encripta antes
        // de guardar. Por defecto se mantiene la actual (arriba), así
        // que esto solo pisa el campo cuando realmente se pidió
        // cambiarla.
        if (password && password.trim() !== "") {
            const passwordError = getPasswordError(password);
            if (passwordError) {
                return res.status(400).json({ message: passwordError });
            }
            // Compara contra el hash actual para no permitir cambiarla
            // por la misma contraseña de siempre.
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
                return res.status(500).json({message: "Error interno del servidor", error: error.message})
            }
            payload.img_url = req.file.path
            payload.public_id = req.file.filename
        }
        const nurseUpdated = await nursesModel.findByIdAndUpdate(req.params.id, payload, { new: true })
        if(!nurseUpdated){
            const error = new Error("Error updatinf a nurse");
            return res.status(500).json({message: "Error interno del servidor", error: error.message})
        }
        return res.status(200).json({message: "Enfermera actualizada correctamente", nurse: nurseUpdated})
    } catch (error) {
        console.log("Error: ", error)
        return res.status(500).json({message: "Error interno del servidor"})
    }
}

nursesController.updateOwnProfile = async (req, res) => {
    try {
        const nurseId = req.user.id;

        const nurseFound = await nursesModel.findById(nurseId);
        if (!nurseFound) {
            return res.status(404).json({ message: "Perfil de la enfermera no encontrado" });
        }

        // Excluye is_active, is_verified y time_out por seguridad,
        // esos los controla solo un admin. La contraseña sí se puede
        // cambiar aquí (mismo criterio que adminController.updateAdmin
        // y nursesController.updateNurse): solo si viene no vacía.
        const {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password
        } = req.body;

        const payload = {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            is_active: nurseFound.is_active,
            is_verified: nurseFound.is_verified,
            time_out: nurseFound.time_out
        };

        if (password && password.trim() !== "") {
            const passwordError = getPasswordError(password);
            if (passwordError) {
                return res.status(400).json({ message: passwordError });
            }
            const samePassword = await bcrypt.compare(password, nurseFound.password);
            if (samePassword) {
                return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
            }
            payload.password = await bcrypt.hash(password, 10);
        }

        if (req.file) {
            // Borra la imagen anterior solo si tiene un public_id registrado.
            if (nurseFound.public_id) {
                await cloudinary.uploader.destroy(nurseFound.public_id);
            }

            payload.img_url = req.file.path;
            payload.public_id = req.file.filename;
        } else if (req.body.img_url === null || req.body.img_url === "null") {
            // Elimina la foto (a diferencia de doctor y recepción,
            // aquí la foto es opcional en el modelo). Mismo criterio
            // que adminController.updateAdmin.
            if (nurseFound.public_id) {
                await cloudinary.uploader.destroy(nurseFound.public_id);
            }
            payload.img_url = null;
            payload.public_id = null;
        }

        const nurseUpdated = await nursesModel.findByIdAndUpdate(nurseId, payload, { new: true }).select("-password");
        if (!nurseUpdated) {
            return res.status(500).json({ message: "Error al actualizar tu perfil" });
        }

        return res.status(200).json({ 
            message: "Tu perfil se actualizó correctamente", 
            user: nurseUpdated 
        });

    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ message: "Error interno del servidor al actualizar tu perfil" });
    }
};

export default nursesController;