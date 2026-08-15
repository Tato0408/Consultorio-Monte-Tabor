import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";

import receptionistsModel from "../../models/receptionist/receptionist.js";

import { config } from "../../../config.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

//array de funciones, aqui agregamos las funciones y 
//al final del archivo este objeto lo exportaremos
const registerReceptionistController = {};


registerReceptionistController.register =
  async (req, res) => {
    //Try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al registrar
    try {

      //#1- Solicitar los datos
      //Obtiene toda la informacion enviada desde el formulario
      //los datos vienen dentro del body de la peticion
      const {
        name,
        last_name,
        dui,
        birth_date,
        phone,
        email,
        password,
        is_verified,
        loginAttempts,
        timeOut,
      } = req.body;

      // IMAGEN PERFIL
      //Guarda la ruta de la imagen del recepcionista que proporciona el middleware de subida
      const img_url =
        req.files["receptionistImage"][0].path;

      //Guarda el nombre o id publico unico de la imagen generado en cloudinary
      const img_public_id =
        req.files["receptionistImage"][0].filename;

      //#2- Validar si el correo existe
      //Busca en la coleccion si ya existe un documento con ese mismo correo electronico
      const existsReceptionist =
        await receptionistsModel.findOne({
          email,
        });

      //Si encuentra un registro con ese correo se cancela todo el proceso de registro
      //y devuelve un codigo 400 indicando que el recepcionista ya existe
      if (existsReceptionist) {
        return res.status(400).json({
          message:
            "El recepcionista ya existe",
        });
      }

      // ENCRIPTAR CONTRASEÑA
      //Encripta la contraseña usando bcrypt
      //El numero 10 representa la cantidad de rondas utilizadas para generar el hash
      const passwordHashed =
        await bcryptjs.hash(password, 10);

      // GENERAR CÓDIGO
      //Genera un codigo aleatorio de 3 bytes y lo convierte a una cadena de texto hexadecimal
      const randomCode =
        crypto.randomBytes(3).toString(
          "hex",
        );

      // TOKEN
      //Crea un token jwt firmando todos los datos del recepcionista junto con el codigo generado
      //utiliza la clave secreta de la configuracion y se le pone un tiempo de expiracion de 15 minutos
      const token = jsonwebtoken.sign(
        {
          randomCode,

          img_url,
          img_public_id,

          name,
          last_name,
          dui,
          birth_date,
          phone,

          email,
          password: passwordHashed,

          is_verified,
          loginAttempts,
          timeOut,
        },

        config.JWT.secret,

        {
          expiresIn: "15m",
        },
      );

      // COOKIE
      //Guarda el token generado dentro de una cookie llamada registrationCookie
      //maxbirth_date define el tiempo de vida en milisegundos y httpOnly sirve por seguridad para que no se acceda desde el cliente
      res.cookie(
        "registrationCookie",
        token,
        {
          maxAge: 15 * 60 * 1000,
          httpOnly: true,
        },
      );

      // EMAIL
      //Define el contenido del correo con el codigo aleatorio de verificacion que expira en 15 minutos
      const htmlContent =
        "Para verificar tu cuenta utiliza este código: " +
        randomCode +
        ". Expira en 15 minutos.";

      // SE ENVÍA EMAIL
      //Envia el correo utilizando Mailjet
      try {
        await sendEmail(
          email,
          "Verificación de cuenta",
          htmlContent,
        );
      } catch (error) {
        //Muestra el error exacto en la consola para saber que fallo
        console.log("error " + error);

        //500 porque fue un error interno de servidor al intentar mandar el email
        return res.status(500).json({
          message: "Error al enviar el correo",
        });
      }

      //devulve un codigo 200 indiacndo que la peticion fue exitosa y el correo de verificacion se envio
      return res.status(200).json({
        message: "Correo de verificación enviado",
      });

    } catch (error) {
      //Si ocurre un error durante todo el proceso de registro muestra une rror
      console.log("error " + error);

      //500 porque fue un error interno de servidor
      return res.status(500).json({
        message: "Error interno del servidor",
      });
    }
  };

registerReceptionistController.verifyCode =
  async (req, res) => {
    //El try sirve para capturar cualquier error que pueda ocurrir dentro del bloque al verificar el codigo
    try {
      //Obtiene el codigo de verificacion que escribio el usuario en el formulario
      const {
        verificationCodeRequest,
      } = req.body;

      //tOKEN
      //Obtiene el token guardado que viene dentro de la cookie registrationCookie
      const token =
        req.cookies.registrationCookie;

      // DECODIFICAR TOKEN
      //Verifica y decodifica el token usando la clave secreta para recuperar los datos guardados
      const decoded =
        jsonwebtoken.verify(
          token,
          config.JWT.secret,
        );

      //Desestructura todos los datos del recepcionista y el codigo guardado que venian dentro del token
      const {
        randomCode: storedCode,

        img_url,
        img_public_id,

        name,
        last_name,
        dui,
        birth_date,
        phone,

        email,
        password,

        is_verified,
        loginAttempts,
        timeOut,
      } = decoded;

      // VALIDAR CODIGO
      //Compara si el codigo enviado por el usuario es diferente al codigo guardado en el token
      if (
        verificationCodeRequest !==
        storedCode
      ) {
        //Si no coinciden los codigos cancela el proceso y devuelve un codigo 400 de error
        return res.status(400).json({
          message: "Código inválido",
        });
      }

      // CREAR RECEPCIONISTA
      //Crea el nuevo documento en la base de datos utilizando el modelo receptionistsModel y los datos del token
      const newReceptionist =
        new receptionistsModel({
          img_url,
          img_public_id,

          name,
          last_name,
          dui,
          birth_date,
          phone,

          email,
          password,

          //Le asigna true a la verificacion porque ya metio el codigo correcto
          is_verified: true,

          loginAttempts,
          timeOut,
        });

      //Guarda el nuevo registro del recepcionista en la coleccion de MongoDB
      await newReceptionist.save();

      // BORRAR COOKIE
      //Elimina la cookie del navegador ya que terminamos el proceso de registro con exito
      res.clearCookie(
        "registrationCookie",
      );

      //devulve un codigo 200 indiacndo que la peticion fue exitosa y el recepcionista fue registrado
      return res.status(200).json({
        message:
          "Recepcionista registrado",
      });

    } catch (error) {
      //Si ocurre un error durante la verificacion muestra une rror
      console.log("error " + error);

      //500 porque fue un error interno de servidor
      return res.status(500).json({
        message: "Error interno del servidor",
      });
    }
  };

export default registerReceptionistController;