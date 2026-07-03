import doctorsModel from "../../models/doctors/doctors.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";

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

    //Busca si ya existe un dcotor con el mismo correo, dui o licencia
    const doctorExists =
      await doctorsModel.findOne({
        //El $or singifica que basta con q una condicion se cumpla
        //para considerar que el doctor ya existe
        $or: [
          { email },
          { dui },
          { license_number },
        ],
      });

      //Si ya se encuentra un registro se cancela el proceso de creacion
    if (doctorExists) {
      return res.status(400).json({
        message:
          "Ya existe un doctor con ese correo, DUI o licencia",
      });
    }
    //Encripta la contraseña usando bcrypt
    //El numero 10 representa la cantidad de rondas utilizadas para generar el hash
    const passwordHashed =
      await bcryptjs.hash(password, 10);

       //Crea un nuevo documento utilizando el modelo doctorsModel
    const newDoctor =
      new doctorsModel({
        img_url:
          req.files["doctorImage"][0].path,

        img_public_id:
          req.files["doctorImage"][0].filename,

        name,
        last_name,
        dui,
        birth_date,
        gender,
        phone,
        license_number,

        license_url:
          req.files["licenseImage"][0].path,

        license_public_id:
          req.files["licenseImage"][0].filename,

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
  //El try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al actualizar
  try {
    //Obtiene toda la informacion editada que mandaron desde el formulario
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
      is_active,
      is_verified,
    } = req.body;

    //Busca al doctor en la base de datos usando el id que viene por los parametros de la url
    const doctorFound =
      await doctorsModel.findById(
        req.params.id
      );

    //Si no encuentra ningun doctor con ese id se cancela todo el proceso
    //y devuelve un codigo 404 indicando que no fue encontrado
    if (!doctorFound) {
      return res.status(404).json({
        message:
          "Doctor not found",
      });
    }

    //Crea una constante con el objeto de los datos que vamos a actualizar en el modelo
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
    //Verifica con el signo de interrogacion si el usuario subio una nueva foto de perfil
    if (req.files?.doctorImage) {
      //Elimina la foto vieja que estaba guardada en cloudinary usando el img_public_id del doctor encontrado
      await cloudinary.uploader.destroy(
        doctorFound.img_public_id
      );

      //Guarda la nueva ruta de la imagen en la propiedad img_url de nuestro objeto
      updatedData.img_url =
        req.files["doctorImage"][0].path;

      //Guarda el nuevo nombre o id publico de la imagen en cloudinary
      updatedData.img_public_id =
        req.files["doctorImage"][0].filename;
    }

    // FOTO LICENCIA
    //Verifica si en las variables de los archivos subieron una nueva imagen de la licencia
    if (req.files?.licenseImage) {
      //Elimina la imagen de la licencia anterior de cloudinary usando su respectivo id publico
      await cloudinary.uploader.destroy(
        doctorFound.license_public_id
      );

      //Guarda la nueva ruta del archivo de la licencia en la propiedad license_url
      updatedData.license_url =
        req.files["licenseImage"][0].path;

      //Guarda el nuevo id publico de la licencia que nos da cloudinary
      updatedData.license_public_id =
        req.files["licenseImage"][0].filename;
    }

    //Busca al doctor por su id y actualiza su documento pasandole el objeto updatedData
    //el new true sirve para que devuelva el documento ya con los cambios aplicados
    await doctorsModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y que el doctor se actualizo de forma correcta
    return res.status(200).json({
      message:
        "Doctor updated",
    });

  } catch (error) {
    //Si ocurre un error durante la actualizacion muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
};

//DELETE
doctorController.deleteDoctor = async (req, res) => {
  //El try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al borrar
  try {
    //Busca al doctor en la base de datos usando el id que viene por los parametros de la url
    const doctorFound = await doctorsModel.findById(req.params.id);

    //Si no encuentra ningun doctor con ese id devuelve un codigo 404
    if (!doctorFound) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    // VALIDACIÓN: Solo borrar de Cloudinary si el ID público existe
    //Si el doctor tiene guardado un id de foto de perfil lo borra de cloudinary
    if (doctorFound.img_public_id) {
      await cloudinary.uploader.destroy(doctorFound.img_public_id);
    }

    // VALIDACIÓN: Solo borrar de Cloudinary si el ID público existe
    //Si el doctor tiene guardado un id de la imagen de su licencia lo borra de cloudinary
    if (doctorFound.license_public_id) {
      await cloudinary.uploader.destroy(doctorFound.license_public_id);
    }

    // BORRAR DOCUMENTO DE LA BASE DE DATOS
    //Elimina por completo el registro del doctor de la coleccion de la base de datos
    await doctorsModel.findByIdAndDelete(req.params.id);

    //devulve un codigo 200 indiacndo que la peticion fue exitosa y se borro el registro
    return res.status(200).json({
      message: "Doctor deleted",
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

doctorController.updateOwnProfile = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir al intentar actualizar el propio perfil
  try {
    //Obtiene el id del doctor que esta logueado desde los datos del token en req.user
    const doctorId = req.user.id; 

    //Busca al doctor en la coleccion usando el id extraido del usuario logueado
    const doctorFound = await doctorsModel.findById(doctorId);

    //Si no encuentra el perfil de ese doctor en el sistema devuelve un codigo 404
    if (!doctorFound) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    //Obtiene toda la informacion enviada desde el formulario del perfil
    //los datos vienen dentro del body de la peticion
    const {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    } = req.body;

    //Crea una constante con el objeto de los datos del propio perfil que se van a actualizar
    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    };

    //Verifica si el doctor subio una nueva imagen para cambiar su foto de perfil
    if (req.files?.doctorImage) {
      //Si el doctor ya tenia una foto guardada en la nube, la borra de cloudinary
      if (doctorFound.img_public_id) {
        await cloudinary.uploader.destroy(doctorFound.img_public_id);
      }
      //Guarda la nueva ruta de la imagen de perfil y su nuevo id de cloudinary en el objeto
      updatedData.img_url = req.files["doctorImage"][0].path;
      updatedData.img_public_id = req.files["doctorImage"][0].filename;
    }

    //Verifica si el doctor subio un nuevo archivo para su imagen de licencia
    if (req.files?.licenseImage) {
      //Si el doctor ya tenia una imagen de licencia guardada, la borra de cloudinary
      if (doctorFound.license_public_id) {
        await cloudinary.uploader.destroy(doctorFound.license_public_id);
      }
      //Guarda la nueva ruta del archivo de licencia y su nuevo id de cloudinary en el objeto
      updatedData.license_url = req.files["licenseImage"][0].path;
      updatedData.license_public_id = req.files["licenseImage"][0].filename;
    }

    //Busca al doctor usando su propio id y lo actualiza metiendole el objeto updatedData
    const profileUpdated = await doctorsModel.findByIdAndUpdate(
      doctorId,
      updatedData,
      { new: true }
    );

    //devulve un codigo 200 indiacndo que la peticion fue exitosa
    //y envia un json con el mensaje y los datos del usuario actualizados
    return res.status(200).json({
      message: "Your profile has been updated successfully",
      user: profileUpdated
    });

  } catch (error) {
    //Si ocurre un error durante la consulta del perfil muestra une rror
    console.log("error " + error);
    
    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error updating your profile",
    }); // Cerrado correctamente el objeto y el método .json()
  } // Cerrado correctamente el bloque catch
}; // Cerrada correctamente la función asíncrona

// =====================
// SEARCH
// =====================
doctorController.searchDoctors = async (req, res) => {
  //El try captura cualquier error que pueda ocurrir dentro del bloque al buscar registros
  try {
    //Obtiene el parametro search enviado desde los query parameters de la url
    const { search } = req.query;

    //Si el parametro search no existe o viene vacio solo con espacios en blanco
    if (!search || search.trim() === "") {
      //Busca todos los documentos de la coleccion de forma general sin filtros
      const doctors = await doctorsModel.find();

      //devulve un codigo 200 indiacndo que fue exitoso y manda a todos los doctores en un json
      return res.status(200).json(doctors);
    }

    //Si viene un parametro de busqueda, busca en el modelo usando filtros condicionales
    const doctors = await doctorsModel.find({
      //$or singifica que basta con q una condicion se cumpla para traer al doctor
      $or: [
        {
          name: {
            //$regex sirve para buscar coincidencias parciales del texto enviado
            $regex: search,
            //$options "i" significa que va a ignorar mayusculas y minusculas al buscar
            $options: "i",
          },
        },
        {
          last_name: {
            //Busca coincidencias parciales ignorando mayusculas en el apellido del doctor
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            //Busca coincidencias parciales ignorando mayusculas en el correo del doctor
            $regex: search,
            $options: "i",
          },
        },
        {
          dui: {
            //Busca coincidencias parciales ignorando mayusculas en el DUI del doctor
            $regex: search,
            $options: "i",
          },
        },
        {
          license_number: {
            //Busca coincidencias parciales ignorando mayusculas en el numero de licencia del doctor
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            //Busca coincidencias parciales ignorando mayusculas en el telefono del doctor
            $regex: search,
            $options: "i",
          },
        },
      ],
    });

    //devulve un codigo 200 indiacndo exito y envia todos los doctores filtrados en un json
    return res.status(200).json(doctors);
  } catch (error) {
    //Si ocurre un error durante el filtro de busqueda muestra une rror
    console.log("error " + error);

    //500 porque fue un error interno de servidor
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export default doctorController;