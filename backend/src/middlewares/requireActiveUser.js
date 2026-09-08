import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";
import nursesModel from "../models/nurses/nurses.js";
import receptionistModel from "../models/receptionist/receptionist.js";

// Modelo por rol, para poder revisar el estado de la cuenta segun quien hace
// la peticion. El admin no tiene modelo aqui: es el unico rol que no se puede
// desactivar.
const modelByRole = {
  patient: patientsModel,
  doctor: doctorsModel,
  nurse: nursesModel,
  receptionist: receptionistModel,
};

// Corta la sesion viva de una cuenta que fue desactivada despues de iniciar
// sesion. El login ya bloquea el acceso inicial (loginController y el flujo
// de paciente), pero el token dura dias: sin esta revision un paciente o
// doctor recien desactivado seguiria operando hasta que su token venza.
// Se monta solo en las rutas donde importa (portal del paciente, dashboards
// de rol), no en todo el backend, para no agregar una consulta por request
// en cada endpoint. Requiere ejecutarse despues de authenticate().
export const requireActiveUser = async (req, res, next) => {
  try {
    const Model = modelByRole[req.user?.role];
    if (!Model) return next();

    const account = await Model.findById(req.user.id).select("is_active").lean();
    if (account && account.is_active === false) {
      return res.status(401).json({
        message: "Su cuenta ha sido desactivada. Si cree que esto es un error, comuníquese con el administrador.",
      });
    }

    next();
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
