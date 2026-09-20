import nurseModel from "../../models/nurses/nurses.js";
import doctorModel from "../../models/doctors/doctors.js";
import adminModel from "../../models/admin/admins.js";
import recepcionistModel from "../../models/receptionist/receptionist.js";
import patientsModel from "../../models/patients/patients.js";

// authController se ejecuta cada vez que el usuario recarga la página,
// abre una pestaña nueva o cambia de ruta. Permite mantener la sesión
// activa mientras la cookie de autenticación siga vigente, sin pedir
// las credenciales de nuevo.

// Mapea cada tipo de usuario con su modelo correspondiente, para
// acceder al modelo adecuado según el rol del usuario autenticado.
const role_models = {
    admin: adminModel,
    doctor: doctorModel,
    nurse: nurseModel,
    receptionist: recepcionistModel,
    patient: patientsModel,
};

const authController = {};

// Obtiene el perfil completo del usuario autenticado en la sesión
// actual y devuelve la información necesaria para el frontend.
authController.getCurrentUser = async (req, res) => {
    try {
        // Toma el id y el tipo de usuario desde req.user, que viene del
        // token verificado, para evitar que el usuario pueda indicar
        // quién hace la petición.
        const { id, userType } = req.user;

        // Selecciona el modelo según el tipo de usuario.
        const model = role_models[userType];
        if (!model) {
            return res.status(400).json({ message: "Tipo de usuario inválido en el token" });
        }

        //Busca el usuario por su id, excluyendo el campo de contraseña
        const userFound = await model.findById(id).select("-password");
        if (!userFound) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Una cuenta desactivada despues de iniciar sesion pierde la sesion en
        // la siguiente revalidacion: se responde 401 para que el frontend la
        // cierre, igual que hace el login al rechazar el acceso inicial. El
        // admin queda fuera: es el unico rol que no se puede desactivar.
        if (userType !== "admin" && userFound.is_active === false) {
            return res.status(401).json({
                message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
            });
        }

        // Arma la respuesta con los campos que necesita el frontend.
        return res.status(200).json({
            userType,
            user: {
                id: userFound._id,
                name: userFound.name,
                last_name: userFound.last_name,
                email: userFound.email,
                dui: userFound.dui,
                birth_date: userFound.birth_date,
                gender: userFound.gender,
                // La imagen: cada modelo usa un nombre de campo distinto,
                // se devuelve el primero que exista.
                image: userFound.image || userFound.img_url || userFound.doctorImage || null,
                public_id: userFound.public_id || userFound.img_public_id || null,
                is_active: userFound.is_active,
                is_verified: userFound.is_verified,
                // Solo doctor y admin tienen estos campos en su propio modelo (ver
                // updateOwnSignature/updateOwnSeal); para el resto de roles quedan en null.
                // Como id sale de req.user (nunca del cliente), esto es siempre la firma y
                // el sello del propio usuario autenticado, jamás los de otro doctor.
                signature_url: userFound.signature_url || null,
                seal_url: userFound.seal_url || null,
            },
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default authController;