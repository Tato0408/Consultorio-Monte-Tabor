import nurseModel from "../../models/nurses/nurses.js";
import doctorModel from "../../models/doctors/doctors.js";
import adminModel from "../../models/admin/admins.js";
import recepcionistModel from "../../models/receptionist/receptionist.js";
import patientsModel from "../../models/patients/patients.js";

//AuthConteoller se ejecuta cada vez que el usuario refresaca la pagina, abre una pestaña o cambia de ruta, esto permite no estar iniciando sesion durante el tiempo de vida de la cookie de inicio de sesion

//Mapeo de roles, esto me permite poder acceder al modelo necesario dependiendo de su rol
const role_models = {
    admin: adminModel,
    doctor: doctorModel,
    nurse: nurseModel,
    receptionist: recepcionistModel,
    patient: patientsModel,
};

const authController = {};

//Metodo que obtiene el perfil completo del usuario autenticado actual en la sesion, me devuelve al final la informacion del usuario necesaria
authController.getCurrentUser = async (req, res) => {
    try {
        //Extraemos los datos del usuario, usamos req.user para saber quien esta haciendo la consulta, extrae directamente quien es, no deja que el usuario pueda reescribir quien hace la peticion
        const { id, userType } = req.user;

        //Seleecionamos el modelo dependiendo del tipo de usuario
        const model = role_models[userType];
        if (!model) {
            return res.status(400).json({ message: "Invalid user type in token" });
        }

        //Busca el usuario por su id, excluyendo el campo de contraseña
        const userFound = await model.findById(id).select("-password");
        if (!userFound) {
            return res.status(404).json({ message: "User not found" });
        }

        //Estructuramos la respuesta, enviando los campos necesarios que usara el frotend
        return res.status(200).json({
            userType,
            user: {
                id: userFound._id,
                name: userFound.name,
                last_name: userFound.last_name,
                email: userFound.email,
                dui: userFound.dui,
                age: userFound.age,
                gender: userFound.gender,
                // imagen — cada modelo usa un nombre diferente, devolvemos el que existe
                image: userFound.image || userFound.img_url || userFound.doctorImage || null,
                public_id: userFound.public_id || userFound.img_public_id || null,
                is_active: userFound.is_active,
                is_verified: userFound.is_verified,
            },
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default authController;