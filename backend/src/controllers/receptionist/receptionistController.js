import receptionistsModel from "../../models/receptionist/receptionist.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";

//Array de funciones, aqui agregamos las funciones y 
//al final del archivo este objeto lo exportaremos
const receptionistController = {};

//GET ALL, obtiene todos los recepcionistas registrados
receptionistController.getReceptionists = async (req, res) => {
  //Try sirve para capturar cualquier error que pueda ocurrir dentro
  // del bloque
  try {
    //receptionistsModel.find() busca todos los documentos de la colección receptionists.
    //y lo guarda en la constante receptionists
    const receptionists = await receptionistsModel.find();

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y envia  a todos los recepcionistas encontrados en un json
    return res.status(200).json(receptionists);
  } catch (error) {
    //Si ocurre un error durante la consulta muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//CREATE, registra un recepcionista nuevi
receptionistController.createReceptionist = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir durante el registro
  try {
    //Obtiene toda la informacion enviada desde el formulario
    //los datos vienen dentro del body de la peticion
    const { name, last_name, dui, birth_date, phone, email, password } = req.body;

    //Busca si ya existe un recepcionista con el mismo correo o dui
    const receptionistExists = await receptionistsModel.findOne({
      //El $or singifica que basta con q una condicion se cumpla
      //para considerar que el recepcionista ya existe
      $or: [{ email }, { dui }],
    });

    //Si ya se encuentra un registro se cancela el proceso de creacion
    if (receptionistExists) {
      return res.status(400).json({
        message: "Ya existe un recepcionista con ese correo o DUI",
      });
    }

    //Encripta la contraseña usando bcrypt
    //El numero 10 representa la cantidad de rondas utilizadas para generar el hash
    const passwordHashed = await bcryptjs.hash(password, 10);

    //Crea un nuevo documento utilizando el modelo receptionistsModel
    const newReceptionist = new receptionistsModel({
      img_url: req.files["receptionistImage"][0].path,
      img_public_id: req.files["receptionistImage"][0].filename,
      name,
      last_name,
      dui,
      birth_date,
      phone,
      email,
      password: passwordHashed,
      is_active: true,
      is_verified: true,
      loginAttempts: 0,
    });

    await newReceptionist.save();

    return res.status(201).json({
      message: "Recepcionista creado correctamente",
    });
  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// =====================
// UPDATE
// =====================
receptionistController.updateReceptionist = async (req, res) => {
  //El try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al actualizar
  try {
    //Obtiene toda la informacion editada que mandaron desde el formulario
    //los datos vienen dentro del body de la peticion
    const {
      name,
      last_name,
      dui,
      birth_date,
      phone,
      email,
      password,
      is_active,
      is_verified,
    } = req.body;

    //Busca al recepcionista en la base de datos usando el id que viene por los parametros de la url
    const receptionistFound = await receptionistsModel.findById(req.params.id);

    //Si no encuentra ningun recepcionista con ese id se cancela todo el proceso
    //y devuelve un codigo 404 indicando que no fue encontrado
    if (!receptionistFound) {
      return res.status(404).json({
        message: "Receptionist not found",
      });
    }

    //Crea una constante con el objeto de los datos que vamos a actualizar en el modelo
    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      phone,
      email,
      is_active,
      is_verified,
    };

    // Si viene una nueva contraseña, la encriptamos antes de guardar
    //Comprueba si escribieron algo en el campo de contraseña para cambiarla
    if (password && password.trim() !== "") {
      //Genera el nuevo hash encriptado de la contraseña con 10 rondas
      updatedData.password = await bcryptjs.hash(password, 10);
    }

    // NUEVA FOTO PERFIL
    //Verifica con el signo de interrogacion si el usuario subio una nueva foto de recepcionista
    if (req.files?.receptionistImage) {
      //Elimina la foto vieja que estaba guardada en cloudinary usando el img_public_id del recepcionista encontrado
      if (receptionistFound.img_public_id) {
        await cloudinary.uploader.destroy(receptionistFound.img_public_id);
      }
      //Guarda la nueva ruta de la imagen en la propiedad img_url de nuestro objeto
      updatedData.img_url = req.files["receptionistImage"][0].path;
      //Guarda el nuevo nombre o id publico de la imagen en cloudinary
      updatedData.img_public_id = req.files["receptionistImage"][0].filename;
    }

    //Busca al recepcionista por su id y actualiza su documento pasandole el objeto updatedData
    //el new true sirve para que devuelva el documento ya con los cambios aplicados
    await receptionistsModel.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    });

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y que el recepcionista se actualizo de forma correcta
    return res.status(200).json({
      message: "Receptionist updated",
    });
  } catch (error) {
    //Si ocurre un error durante la actualizacion muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// =====================
// DELETE
// =====================
receptionistController.deleteReceptionist = async (req, res) => {
  //El try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al borrar
  try {
    //Busca al recepcionista en la base de datos usando el id que viene por los parametros de la url
    const receptionistFound = await receptionistsModel.findById(req.params.id);

    //Si no encuentra ningun recepcionista con ese id devuelve un codigo 404
    if (!receptionistFound) {
      return res.status(404).json({
        message: "Receptionist not found",
      });
    }

    //Si el recepcionista tiene guardado un id de foto de perfil lo borra de cloudinary
    if (receptionistFound.img_public_id) {
      await cloudinary.uploader.destroy(receptionistFound.img_public_id);
    }

    //Elimina por completo el registro del recepcionista de la coleccion de la base de datos
    await receptionistsModel.findByIdAndDelete(req.params.id);

    //devulve un codigo 200 indiacndo que la peticion fue exitosa y se borro el registro
    return res.status(200).json({
      message: "Receptionist deleted",
    });
  } catch (error) {
    //Si ocurre un error durante la eliminacion muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

receptionistController.updateOwnProfile = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir al intentar actualizar el propio perfil
  try {
    //Obtiene el id del recepcionista que esta logueado desde los datos del token en req.user
    const receptionistId = req.user.id;
    
    //Busca al recepcionista en la coleccion usando el id extraido del usuario logueado
    const receptionistFound = await receptionistsModel.findById(receptionistId);

    //Si no encuentra el perfil de ese recepcionista en el sistema devuelve un codigo 404
    if (!receptionistFound) {
      return res.status(404).json({
        message: "Receptionist profile not found",
      });
    }
    
    //Obtiene toda la informacion enviada desde el formulario del perfil
    //los datos vienen dentro del body de la peticion
    const { name, last_name, dui, birth_date, phone, email } = req.body;

    //Crea una constante con el objeto de los datos del propio perfil que se van a actualizar
    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      phone,
      email,
    };

    //Verifica si el recepcionista subio una nueva imagen para cambiar su foto de perfil
    if (req.files?.receptionistImage) {
      //Si el recepcionista ya tenia una foto guardada en la nube, la borra de cloudinary
      if (receptionistFound.img_public_id) {
        await cloudinary.uploader.destroy(receptionistFound.img_public_id);
      }
      //Guarda la nueva ruta de la imagen de perfil y su nuevo id de cloudinary en el objeto
      updatedData.img_url = req.files["receptionistImage"][0].path;
      updatedData.img_public_id = req.files["receptionistImage"][0].filename;
    }

    //Busca al recepcionista usando su propio id y lo actualiza metiendole el objeto updatedData
    const profileUpdated = await receptionistsModel.findByIdAndUpdate(
      receptionistId,
      updatedData,
      { new: true }
    );

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y envia un json con el mensaje y los datos del usuario actualizados
    return res.status(200).json({
      message: "Your profile has been updated successfully",
      user: profileUpdated,
    });
  } catch (error) {
    //Si ocurre un error durante la consulta del perfil muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error updating your profile",
    });
  }
};

// ==========================================
// ¡MÉTODO DE BÚSQUEDA TOTALMENTE CORREGIDO!
// ==========================================
receptionistController.searchReceptionist = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir dentro del bloque al buscar registros
  try {
    //Obtiene el parametro search enviado desde los query parameters de la url
    const { search } = req.query;

    //Si el parametro search no existe o viene vacio solo con espacios en blanco
    if (!search || search.trim() === "") {
      //Busca todos los documentos de la coleccion de forma general sin filtros
      const allReceptionists = await receptionistsModel.find();
      
      //devulve un codigo 200 indiacndo que fue exitoso y manda a todos los recepcionistas en un json
      return res.status(200).json(allReceptionists);
    }

    // CORRECCIÓN: Llamamos correctamente a 'receptionistsModel' y guardamos en 'results'
    //Si viene un parametro de busqueda, busca en el modelo usando filtros condicionales
    const results = await receptionistsModel.find({
      //$or singifica que basta con q una condicion se cumpla para traer al recepcionista
      $or: [
        { name: { //$regex sirve para buscar coincidencias parciales del texto enviado
          $regex: search, //$options "i" significa que va a ignorar mayusculas y minusculas al buscar
          $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { dui: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    });
    //devulve un codigo 200 indiacndo exito y envia todos los recepcionistas filtrados en un json
    return res.status(200).json(results);
  } catch (error) {
    //Si ocurre un error durante el filtro de busqueda muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export default receptionistController;