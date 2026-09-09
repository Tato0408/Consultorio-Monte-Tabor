import adminModel from "../models/admin/admins.js";
import doctorsModel from "../models/doctors/doctors.js";
import nursesModel from "../models/nurses/nurses.js";
import receptionistModel from "../models/receptionist/receptionist.js";

// Modelo y prefijo de nombre según el rol de quien hace la petición
// (req.user.role, puesto por authenticate.js a partir del JWT).
const actor_models = {
  admin: adminModel,
  doctor: doctorsModel,
  nurse: nursesModel,
  receptionist: receptionistModel,
};
const actor_prefix = { doctor: "Dr.", nurse: "Enf." };

// Busca el id y el nombre real de quien hizo la petición, para firmar con
// su nombre las entradas de la línea de tiempo de un tratamiento en vez de
// dejarlas anónimas. Si no se encuentra (usuario borrado, rol desconocido)
// devuelve una etiqueta genérica en vez de fallar toda la operación.
export const resolve_actor = async (req) => {
  const role = req.user?.role;
  const id = req.user?.id || null;
  const model = actor_models[role];
  if (!model || !id) return { id, name: "Sistema" };

  const actor = await model.findById(id).select("name last_name").lean();
  const full_name = actor ? `${actor.name || ""} ${actor.last_name || ""}`.trim() : "";
  if (!full_name) {
    return { id, name: actor_prefix[role] ? `${actor_prefix[role]} (sin nombre)` : "Administrador" };
  }

  return { id, name: actor_prefix[role] ? `${actor_prefix[role]} ${full_name}` : full_name };
};
