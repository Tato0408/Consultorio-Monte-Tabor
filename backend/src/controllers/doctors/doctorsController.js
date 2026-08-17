import doctorsModel from "../../models/doctors/doctors.js";
import adminModel from "../../models/admin/admins.js";
import patientsModel from "../../models/patients/patients.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import proceduresModel from "../../models/procedures/procedures.js";
import consultationsModel from "../../models/consultations/consultation.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError, findStaffDuplicate } from "../../utils/validators.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";
import HTMLStaffCredentials from "../../utils/HTMLStaffCredentials.js";

//array de funciones, aqui agregamos las funciones y
//al final del archivo este objeto lo exportaremos
const doctorController = {};

// Avatar genérico de respaldo cuando el admin no tiene foto propia — mismo placeholder ya usado
// en AppointmentsGrid.jsx para doctores sin foto.
const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dgpreaeg9/image/upload/images_gb0wco.png";

// Crea o actualiza el "doctor espejo" de un admin (ver comentario en el modelo Doctors). Tanto la
// foto como toda la información personal del espejo SIEMPRE vienen del perfil del admin — nunca
// se editan sobre el propio doctor (bloqueado en updateDoctors/deleteDoctor más abajo), así que
// se recalculan por completo en cada sincronización, se cree o no por primera vez.
//
// Primero se busca por linked_admin_id; si no existe, se busca por correo — pero solo se toma ese
// resultado si YA es un espejo. Si el correo pertenece a un doctor real (la vieja convención
// manual de "duplicar" al admin en Doctors, de antes de que existiera esta sincronización
// automática), se deja intacto: nunca se sobreescriben los datos de un doctor real, y tampoco se
// crea uno nuevo con el mismo correo (chocaría contra el índice único de email).
const syncAdminMirrorDoctor = async (admin) => {
  let mirror = await doctorsModel.findOne({ linked_admin_id: admin._id, is_admin_mirror: true });
  if (!mirror) {
    const existingByEmail = await doctorsModel.findOne({ email: admin.email });
    if (existingByEmail) {
      if (!existingByEmail.is_admin_mirror) return;
      mirror = existingByEmail;
    }
  }

  // Todo lo que el espejo muestra sale del admin, siempre — incluida la foto (si el admin no
  // tiene una propia, se usa el avatar genérico, igual que un doctor real sin foto). Los campos
  // que un admin no tiene (DUI, fecha de nacimiento) llevan un valor de relleno determinístico y
  // único por admin mientras no los complete desde su propio perfil.
  const syncedFields = {
    name: admin.name,
    last_name: admin.last_name,
    email: admin.email,
    dui: admin.dui || `ADMIN-${admin._id}`,
    birth_date: admin.birth_date || new Date(1990, 0, 1),
    img_url: admin.image || DEFAULT_AVATAR_URL,
    is_active: admin.is_active !== false,
    is_admin_mirror: true,
    linked_admin_id: admin._id,
  };

  if (mirror) {
    await doctorsModel.findByIdAndUpdate(mirror._id, syncedFields);
    return;
  }

  // No hay ningún doctor con ese correo todavía: se crea el espejo completo. Los campos que un
  // admin nunca tiene (licencia, teléfono, género) llevan un valor de relleno fijo — nunca se
  // usan para nada real, solo satisfacen el esquema de Doctor, que no distingue entre un doctor
  // real y uno espejo.
  await doctorsModel.create({
    ...syncedFields,
    img_public_id: admin.public_id || `admin-mirror-${admin._id}`,
    gender: "No especificado",
    phone: "0000-0000",
    license_number: `ADMIN-${admin._id}`,
    license_url: DEFAULT_AVATAR_URL,
    license_public_id: `admin-mirror-license-${admin._id}`,
    password: admin.password,
    is_verified: true,
    loginAttempts: 0,
  });
};

//GET ALL, obtiene todos los doctores registrados para la pantalla de gestión — excluye los
//"doctores espejo" de los admins (ver is_admin_mirror en el modelo), esos solo deben verse en el
//catálogo de agendamiento (getDoctorsCatalog), no aquí.
doctorController.getDoctors = async (req, res) => {
  //Try sirve para capturar cualquier error que pueda ocurrir dentro
  // del bloque
  try {
    //doctorsModel.find() busca todos los documentos de la colección doctors.
    //y lo guarda en la constante doctors
    //-password: nunca se envia el hash de la contraseña al cliente
    const doctors = await doctorsModel.find({ is_admin_mirror: { $ne: true } }).select("-password");

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y envia  a todos los doctores encontrados en un json
    return res.status(200).json(doctors);
  } catch (error) {
    //Si ocurre un error durante la consulta muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// GET /doctors/catalog — catálogo liviano para agendar citas. Antes de responder, sincroniza el
// doctor espejo de cada admin (crea el que falte, actualiza nombre/foto/estado de los que ya
// existen), así el admin siempre aparece aquí como una opción más de doctor, con su propio
// horario y disponibilidad, sin dejar de ser admin en el resto del sistema.
doctorController.getDoctorsCatalog = async (req, res) => {
  try {
    const admins = await adminModel.find({ email: { $exists: true, $ne: "" } });
    await Promise.all(
      admins.map((admin) =>
        syncAdminMirrorDoctor(admin).catch((err) =>
          console.log(`No se pudo sincronizar el doctor espejo del admin ${admin._id}: ${err}`)
        )
      )
    );

    const doctors = await doctorsModel.find().select("-password");
    return res.status(200).json(doctors);
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//CREATE, registra un doctor nuevi
doctorController.createDoctor = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir durante el registro
  try {
    //Obtiene toda la informacion enviada desde el formulario
    //los datos vienen dentro del body de la peticion
    const {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      license_number,
      email,
      password,
    } = req.body;

    //Valida que ningun campo obligatorio venga vacio
    const requiredError = getMissingRequiredField(
      { name, last_name, dui, birth_date, gender, phone, license_number, email, password },
      ["name", "last_name", "dui", "birth_date", "gender", "phone", "license_number", "email", "password"]
    );
    if (requiredError) {
      return res.status(400).json({ message: requiredError });
    }

    //Valida el formato de telefono/correo/DUI (misma regla que las mascaras del frontend)
    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
    if (formatError) {
      return res.status(400).json({ message: formatError });
    }

    //Valida que la contraseña cumpla los requisitos de seguridad
    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    //La foto de perfil y el documento de licencia son obligatorios en el esquema (required: true);
    //se validan aquí explícitamente para devolver un mensaje claro en vez de que Mongoose truene
    //con un ValidationError que terminaría como un 500 genérico
    if (!req.files?.doctorImage?.[0]) {
      return res.status(400).json({ message: "La foto de perfil es requerida" });
    }
    if (!req.files?.licenseImage?.[0]) {
      return res.status(400).json({ message: "El documento de licencia es requerido" });
    }

    //Busca si el correo o el DUI ya están en uso por CUALQUIER rol de staff (admin, doctor,
    //enfermera o recepcionista) — no solo dentro de la colección de doctores
    const staffDuplicate = await findStaffDuplicate(email, dui);
    if (staffDuplicate) {
      return res.status(400).json(staffDuplicate);
    }

    //La licencia es exclusiva de doctores, se valida aparte del resto del staff
    const licenseExists = await doctorsModel.findOne({ license_number });
    if (licenseExists) {
      return res.status(400).json({
        message: "Ya existe un doctor con ese número de licencia",
      });
    }
    //Encripta la contraseña usando bcrypt
    //El numero 10 representa la cantidad de rondas utilizadas para generar el hash
    const passwordHashed =
      await bcryptjs.hash(password, 10);

       //Crea un nuevo documento utilizando el modelo doctorsModel
    const newDoctor =
      new doctorsModel({
        // La presencia de ambos archivos ya se validó arriba antes de llegar aquí
        img_url:
          req.files?.doctorImage?.[0]?.path,

        img_public_id:
          req.files?.doctorImage?.[0]?.filename,

        name,
        last_name,
        dui,
        birth_date,
        gender,
        phone,
        license_number,

        license_url:
          req.files?.licenseImage?.[0]?.path,

        license_public_id:
          req.files?.licenseImage?.[0]?.filename,

        email,
        password:
          passwordHashed,

        is_active: true,
        is_verified: true,
        loginAttempts: 0,
      });

    await newDoctor.save();

    // Le manda al correo registrado el usuario y la contraseña que el admin
    // acaba de definir, para que el doctor tenga la certeza de haber
    // recibido sus credenciales de acceso. No bloquea la respuesta si el
    // envío falla (ej. Mailjet caído): la cuenta ya quedó creada de todos
    // modos, y el admin puede reenviarlas manualmente si hace falta.
    sendEmail(
      email,
      "Tu cuenta de doctor fue creada",
      HTMLStaffCredentials(`${name} ${last_name}`, "doctor", email, password)
    ).catch((error) => console.log("Error enviando credenciales al doctor:", error));

    return res.status(201).json({
      message:
        "Doctor creado correctamente",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message:
        "Error interno del servidor",
    });
  }
};

//UPDATE
doctorController.updateDoctors = async (req, res) => {
  //El try sirve para atrapar cualquier problema o fallo que ocurra al 
  // intentar actualizar los datos
  try {
    //Desestructura y extrae del body de la peticion 
    // con todos los campos modificables que vienen del form
    const {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      license_number,
      email,
      password,
      is_active,
      is_verified,
    } = req.body;

    //Busca en la base de datos si el doctor realmente existe utilizando el id recibido a traves de
    //  la url
    const doctorFound =
      await doctorsModel.findById(
        req.params.id
      );

    //Si el resultado es nulo o vacio significa que el doctor no existe en el sistema
    //por lo tanto se cancela la ejecucion devolviendo un estado 404 (No encontrado)
    if (!doctorFound) {
      return res.status(404).json({
        message:
          "Doctor no encontrado",
      });
    }

    // El doctor espejo de un admin se sincroniza automáticamente desde su propio perfil de admin
    // (ver syncAdminMirrorDoctor) — editarlo aquí directamente quedaría sobreescrito en la
    // siguiente sincronización, así que se bloquea con un mensaje claro en vez de dejar que
    // parezca que el cambio se guardó.
    if (doctorFound.is_admin_mirror) {
      return res.status(400).json({
        message: "Este doctor representa a un administrador del sistema; edita su perfil de administrador en su lugar.",
      });
    }

    //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
    //romper actualizaciones parciales)
    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
    if (formatError) {
      return res.status(400).json({ message: formatError });
    }

    // Mismo chequeo que al crear: si el correo o DUI editado ya lo usa otro miembro del staff
    // (admin/doctor/enfermera/recepcionista), se avisa con un mensaje claro en vez de dejar que
    // reviente contra el índice único de Mongo con un error 500 genérico. excludeId es el propio
    // doctor, para no chocar contra sí mismo si no cambió el correo/DUI.
    if (email || dui) {
      const staffDuplicate = await findStaffDuplicate(email, dui, req.params.id);
      if (staffDuplicate) {
        return res.status(400).json(staffDuplicate);
      }
    }

    //Crea un objeto nuevo con todos los datos limpios y listos para ser actualizados en la base de datos
    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      license_number,
      email,
      is_active,
      is_verified,
    };

    // Si viene una nueva contraseña, la validamos y encriptamos antes de guardar.
    // Sin este chequeo, cualquier actualización que NO incluya contraseña dejaría el
    // campo fuera de updatedData, así que no hay riesgo de sobreescribirla por accidente.
    if (password && password.trim() !== "") {
      const passwordError = getPasswordError(password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }
      // Compara contra el hash actual para no permitir "cambiarla" por la misma de siempre
      const samePassword = await bcryptjs.compare(password, doctorFound.password);
      if (samePassword) {
        return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
      }
      updatedData.password = await bcryptjs.hash(password, 10);
    }

    // FOTO PERFIL
    //Comprueba si el cliente envio un archivo nuevo bajo la clave 'doctorImage' dentro de req.files
    if (req.files?.doctorImage) {
      //Utiliza el id publico guardado previamente del doctor para eliminar su foto vieja directamente de los servidores de Cloudinary
      await cloudinary.uploader.destroy(
        doctorFound.img_public_id
      );

      //Actualiza la propiedad img_url con la nueva ruta segura que proporciona el middleware de subida
      updatedData.img_url =
        req.files["doctorImage"][0].path;

      //Actualiza la propiedad img_public_id con el nuevo nombre/identificador unico generado en Cloudinary
      updatedData.img_public_id =
        req.files["doctorImage"][0].filename;
    }

    // FOTO LICENCIA
    //Comprueba si en la peticion se adjunto un nuevo archivo correspondiente a la imagen de la licencia medica
    if (req.files?.licenseImage) {
      //Elimina la imagen de la licencia anterior que estaba almacenada en Cloudinary para no dejar archivos basura
      await cloudinary.uploader.destroy(
        doctorFound.license_public_id
      );

      //Asigna la nueva direccion web de la licencia al objeto que se mandara a la base de datos
      updatedData.license_url =
        req.files["licenseImage"][0].path;

      //Asigna el nuevo identificador de Cloudinary de la licencia al objeto de actualizacion
      updatedData.license_public_id =
        req.files["licenseImage"][0].filename;
    }

    //Modifica el documento en MongoDB buscando por su ID y pasandole el objeto updatedData con los cambios realizados
    //{ new: true } es una opcion indispensable para que el metodo retorne el registro nuevo ya modificado y no el viejo
    await doctorsModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    //Si todo salio bien responde con un estado 200 indicando exito y manda un JSON confirmando el cambio
    return res.status(200).json({
      message:
        "Doctor updated",
    });

  } catch (error) {
    //Muestra en la consola del servidor el error exacto que provoco el fallo para poder debugear
    console.log("error " + error);

    //Retorna un estado 500 indicando un error imprevisto en el servidor junto con su respectivo mensaje
    return res.status(500).json({
      message:
        "Error interno del servidor",
    });
  }
};
// =====================
// DELETE (CORREGIDO)
// =====================
doctorController.deleteDoctor = async (req, res) => {
  //El bloque try gestiona y captura cualquier error interno durante el proceso de eliminacion fisica
  try {
    //Intenta buscar al doctor en la base de datos a traves de su identificador ID mandado en la URL
    const doctorFound = await doctorsModel.findById(req.params.id);

    //Si findById no devuelve nada, significa que el registro no existe o ya fue eliminado, por lo que envia un estado 404
    if (!doctorFound) {
      return res.status(404).json({
        message: "Doctor no encontrado",
      });
    }

    // El doctor espejo de un admin desaparece solo (o se recrea) según su cuenta de admin — no
    // se elimina desde aquí directamente para no dejar citas/horario huérfanos mientras el admin
    // sigue activo.
    if (doctorFound.is_admin_mirror) {
      return res.status(400).json({
        message: "Este doctor representa a un administrador del sistema y no se puede eliminar directamente.",
      });
    }

    // No se permite eliminar un doctor con citas o consultas relacionadas: doctor_id es una
    // referencia obligatoria en esos registros, así que borrarlo de todos modos los dejaría
    // apuntando a un doctor fantasma (Citas, Consultas y Reportes podrían fallar o mostrar el
    // campo en blanco al intentar leerlo). Se revisa ANTES de tocar Cloudinary, para no borrar
    // las fotos del doctor si al final la eliminación no procede.
    const [hasAppointments, hasConsultations] = await Promise.all([
      appointmentsModel.exists({ doctor_id: req.params.id }),
      consultationsModel.exists({ "procedure.doctor_id": req.params.id }),
    ]);
    if (hasAppointments || hasConsultations) {
      return res.status(400).json({
        message: "Este doctor tiene citas o consultas relacionadas, por eso no se puede eliminar. Si ya no debe seguir activo, márcalo como inactivo en su lugar.",
      });
    }

    // VALIDACIÓN: Solo borrar de Cloudinary si el ID público existe
    //Condicion de seguridad para confirmar que el doctor cuenta con un identificador de imagen de perfil en la nube
    if (doctorFound.img_public_id) {
      //Llama a la API de Cloudinary para destruir de forma permanente el archivo de imagen de perfil del almacenamiento
      await cloudinary.uploader.destroy(doctorFound.img_public_id);
    }

    // VALIDACIÓN: Solo borrar de Cloudinary si el ID público existe
    //Condicion de seguridad para validar si el doctor tiene registrado un identificador unico de su fotografia de licencia
    if (doctorFound.license_public_id) {
      //Llama a la API de Cloudinary para remover la foto de la licencia de los servidores externos
      await cloudinary.uploader.destroy(doctorFound.license_public_id);
    }

    // BORRAR DOCUMENTO DE LA BASE DE DATOS
    //Ejecuta la eliminacion definitiva del documento correspondiente al doctor de la coleccion de MongoDB
    await doctorsModel.findByIdAndDelete(req.params.id);

    //Manda una respuesta con codigo 200 detallando que el doctor fue removido exitosamente del sistema
    return res.status(200).json({
      message: "Doctor eliminado",
    });

  } catch (error) {
    //En caso de excepcion imprevista se imprime el mensaje de error en la terminal del backend
    console.log("error " + error);

    //Se responde con codigo 500 para notificar que la base de datos o el servidor tuvieron un problema de ejecucion
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// =====================
// SEARCH
// =====================
doctorController.searchDoctors = async (req, res) => {
  //El try captura y maneja cualquier error que pueda irrumpir mientras se procesa el filtro de busqueda
  try {
    //Extrae la propiedad 'search' enviada por el cliente a traves de los query parameters de la URL (?search=valor)
    const { search } = req.query;

    //Evalua si la variable 'search' no fue enviada o si unicamente contiene espacios vacios o en blanco
    if (!search || search.trim() === "") {
      //Al no haber filtros especificos busca todos los documentos existentes en doctorsModel de manera general
      //-password: nunca se envia el hash de la contraseña al cliente
      //Excluye los doctores espejo de los admins (ver is_admin_mirror) — esta búsqueda es para la
      //gestión de doctores, no para el catálogo de agendamiento.
      const doctors = await doctorsModel.find({ is_admin_mirror: { $ne: true } }).select("-password");

      //Retorna la lista total de medicos encontrados con un codigo de estado exitoso 200
      return res.status(200).json(doctors);
    }

    //Si 'search' contiene texto, realiza una busqueda avanzada utilizando filtros condicionales dentro de Mongoose
    //-password: nunca se envia el hash de la contraseña al cliente
    const doctors = await doctorsModel.find({
      is_admin_mirror: { $ne: true },
      //$or asegura que el registro sera valido con que una sola de las propiedades internas coincida con el parametro
      $or: [
        {
          name: {
            //$regex define el texto o patron de busqueda que se quiere comparar en la coleccion de la base de datos
            $regex: search,
            //$options: "i" activa la insensibilidad a las mayusculas y minusculas (Case Insensitive) al buscar
            $options: "i",
          },
        },
        {
          last_name: {
            //Busca coincidencias parciales sin importar mayusculas dentro del apellido del doctor
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            //Evalua si el correo electronico registrado coincide parcial o totalmente con el string buscado
            $regex: search,
            $options: "i",
          },
        },
        {
          dui: {
            //Compara si el documento unico de identidad del doctor contiene los numeros o caracteres indicados
            $regex: search,
            $options: "i",
          },
        },
        {
          license_number: {
            //Permite filtrar a los doctores comprobando si su numero de licencia medica coincide con el patron
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            //Filtra en la coleccion mapeando si el numero telefonico coincide con la secuencia escrita por el cliente
            $regex: search,
            $options: "i",
          },
        },
      ],
    }).select("-password");

    //Manda de regreso al cliente la coleccion de doctores filtrados que cumplieron los criterios junto a un codigo 200
    return res.status(200).json(doctors);
  } catch (error) {
    //Captura el error arrojado y lo muestra por la consola de administracion
    console.log("error " + error);

    //Manda una respuesta con codigo 500 informando al front que se ha producido un error interno del servidor
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// Autoservicio de perfil: el propio doctor edita sus datos básicos y su foto, sin depender de
// authorize("users.doctors","update") (ese permiso es para que un admin gestione a OTROS
// doctores, no para que el doctor edite su propio registro). Mismo patrón que
// nursesController.updateOwnProfile / receptionistController.updateOwnProfile.
// img_url/img_public_id son obligatorios en el modelo (un doctor siempre debe tener foto), así
// que a diferencia de enfermería aquí no se ofrece "eliminar foto", solo reemplazarla.
doctorController.updateOwnProfile = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const doctorFound = await doctorsModel.findById(doctorId);
    if (!doctorFound) {
      return res.status(404).json({ message: "Perfil del doctor no encontrado" });
    }

    const { name, last_name, dui, birth_date, phone, email, password } = req.body;

    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
    if (formatError) {
      return res.status(400).json({ message: formatError });
    }

    const updatedData = { name, last_name, dui, birth_date, phone, email };

    // Si viene una nueva contraseña, la validamos y encriptamos (mismo criterio que
    // doctorController.updateDoctors / adminController.updateAdmin)
    if (password && password.trim() !== "") {
      const passwordError = getPasswordError(password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }
      const samePassword = await bcryptjs.compare(password, doctorFound.password);
      if (samePassword) {
        return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
      }
      updatedData.password = await bcryptjs.hash(password, 10);
    }

    if (req.file) {
      if (doctorFound.img_public_id) {
        await cloudinary.uploader.destroy(doctorFound.img_public_id);
      }
      updatedData.img_url = req.file.path;
      updatedData.img_public_id = req.file.filename;
    }

    const doctorUpdated = await doctorsModel
      .findByIdAndUpdate(doctorId, updatedData, { new: true })
      .select("-password");
    if (!doctorUpdated) {
      return res.status(500).json({ message: "Error al actualizar tu perfil" });
    }

    return res.status(200).json({ message: "Tu perfil se actualizó correctamente", user: doctorUpdated });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor al actualizar tu perfil" });
  }
};

// Mismo criterio que nursesController.countAppointments/countProcedures: cifras reales del
// sistema para las tarjetas de estadísticas de /users/doctors (antes eran constantes fijas
// en DoctorsStats.jsx, sin relación con los datos reales de la clínica).
doctorController.countPatients = async (req, res) => {
  try {
    const count = await patientsModel.countDocuments();
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

doctorController.countAppointments = async (req, res) => {
  try {
    const count = await appointmentsModel.countDocuments({ status: "completed" });
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

doctorController.countProcedures = async (req, res) => {
  try {
    const count = await proceduresModel.countDocuments();
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default doctorController;