import doctorsModel from "../../models/doctors/doctors.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError, findStaffDuplicate } from "../../utils/validators.js";

//array de funciones, aqui agregamos las funciones y 
//al final del archivo este objeto lo exportaremos
const doctorController = {};

//GET ALL, obtiene todos los doctores registrados
doctorController.getDoctors = async (req, res) => {
  //Try sirve para capturar cualquier error que pueda ocurrir dentro
  // del bloque
  try {
    //doctorsModel.find() busca todos los documentos de la colección doctors.
    //y lo guarda en la constante doctors
    const doctors = await doctorsModel.find();

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y envia  a todos los doctores encontrados en un json
    return res.status(200).json(doctors);
  } catch (error) {
    //Si ocurre un error durante la consulta muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
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

    return res.status(201).json({
      message:
        "Doctor creado correctamente",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message:
        "Internal server error",
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
          "Doctor not found",
      });
    }

    //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
    //romper actualizaciones parciales)
    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date }, { requireAdult: true });
    if (formatError) {
      return res.status(400).json({ message: formatError });
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
        "Internal server error",
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
        message: "Doctor not found",
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
      message: "Doctor deleted",
    });

  } catch (error) {
    //En caso de excepcion imprevista se imprime el mensaje de error en la terminal del backend
    console.log("error " + error);

    //Se responde con codigo 500 para notificar que la base de datos o el servidor tuvieron un problema de ejecucion
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

doctorController.updateOwnProfile = async (req, res) => {
  //Bloque try para procesar de forma segura la actualizacion del perfil del usuario que inicio sesion
  try {
    //Toma el ID del doctor autenticado directamente desde la propiedad 'id' que inyecto el middleware del token en req.user
    const doctorId = req.user.id; 

    //Realiza una busqueda en la coleccion de doctores usando el ID obtenido del usuario logueado
    const doctorFound = await doctorsModel.findById(doctorId);

    //Si el doctor asociado al token no es localizado en la base de datos aborta y lanza un codigo 404
    if (!doctorFound) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    //Obtiene del cuerpo de la peticion (body) unicamente los campos generales que el doctor tiene permitido cambiarse a si mismo
    const {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    } = req.body;

    //Estructura un objeto temporal que almacena los valores basicos que seran reemplazados en el documento de MongoDB
    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    };

    //Comprueba si el doctor decidio actualizar su fotografia de perfil mandando un archivo nuevo
    if (req.files?.doctorImage) {
      //Valida si el doctor ya contaba con un identificador de imagen previo guardado en la nube
      if (doctorFound.img_public_id) {
        //Elimina el archivo antiguo de Cloudinary para evitar acumular archivos huerfanos o duplicados
        await cloudinary.uploader.destroy(doctorFound.img_public_id);
      }
      //Inserta la nueva ubicacion del archivo en disco/nube dentro del objeto de los datos modificados
      updatedData.img_url = req.files["doctorImage"][0].path;
      //Establece el nuevo id publico de la imagen generada por Cloudinary para control futuro
      updatedData.img_public_id = req.files["doctorImage"][0].filename;
    }

    //Comprueba si el doctor decidio adjuntar un archivo para reemplazar su documento o fotografia de licencia medica
    if (req.files?.licenseImage) {
      //Verifica la existencia del identificador publico de la licencia actual dentro de la base de datos
      if (doctorFound.license_public_id) {
        //Invoca la destruccion del recurso antiguo en Cloudinary de manera asincrona
        await cloudinary.uploader.destroy(doctorFound.license_public_id);
      }
      //Almacena la ruta de acceso de la nueva licencia subida en las propiedades de actualizacion
      updatedData.license_url = req.files["licenseImage"][0].path;
      //Actualiza el ID publico asignado a la nueva imagen de la licencia en Cloudinary
      updatedData.license_public_id = req.files["licenseImage"][0].filename;
    }

    //Ejecuta la consulta de actualizacion sobre el ID del doctor logueado inyectandole todos los campos preparados en updatedData
    const profileUpdated = await doctorsModel.findByIdAndUpdate(
      doctorId,
      updatedData,
      { new: true }
    );

    //Responde con codigo de exito 200, adjuntando un texto informativo y el objeto completo del usuario ya modificado
    return res.status(200).json({
      message: "Your profile has been updated successfully",
      user: profileUpdated
    });

  } catch (error) {
    //Imprime el error capturado en los logs del servidor en caso de caer en el catch
    console.log("error " + error);
    //Manda una respuesta JSON con codigo de estado de error interno del servidor indicando el punto exacto de la falla
    return res.status(500).json({
      message: "Internal server error updating your profile",
    }); // Cerrado correctamente el objeto y el método .json()
  } // Cerrado correctamente el bloque catch
}; // Cerrada correctamente la función asíncrona

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
      const doctors = await doctorsModel.find();

      //Retorna la lista total de medicos encontrados con un codigo de estado exitoso 200
      return res.status(200).json(doctors);
    }

    //Si 'search' contiene texto, realiza una busqueda avanzada utilizando filtros condicionales dentro de Mongoose
    const doctors = await doctorsModel.find({
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
    });

    //Manda de regreso al cliente la coleccion de doctores filtrados que cumplieron los criterios junto a un codigo 200
    return res.status(200).json(doctors);
  } catch (error) {
    //Captura el error arrojado y lo muestra por la consola de administracion
    console.log("error " + error);

    //Manda una respuesta con codigo 500 informando al front que se ha producido un error interno del servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export default doctorController;