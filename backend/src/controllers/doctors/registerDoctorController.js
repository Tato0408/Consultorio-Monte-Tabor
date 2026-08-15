import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";

import doctorsModel from "../../models/doctors/doctors.js";

import { config } from "../../../config.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

// array de funcioness
const registerDoctorController = {};


//REGISTER
registerDoctorController.register = async (req, res) => {
  try {

    //#1- Solicitar los datos
    const {
      name,
      last_name,
      dui,
      age,
      gender,
      phone,
      license_number,
      email,
      password,
      is_verified,
      loginAttempts,
      timeOut,
    } = req.body;

    // IMAGEN PERFIL
    const img_url =
      req.files["doctorImage"][0].path;

    const img_public_id =
      req.files["doctorImage"][0].filename;

    // IMAGEN LICENCIA
    const license_url =
      req.files["licenseImage"][0].path;

    const license_public_id =
      req.files["licenseImage"][0].filename;

    //#2- Validar si el correo existe
    const existsDoctor =
      await doctorsModel.findOne({ email });

    if (existsDoctor) {
      return res.status(400).json({
        message: "El doctor ya existe",
      });
    }

    //ENCRIPTAR CONTRASEÑA
    const passwordHashed =
      await bcryptjs.hash(password, 10);

    //GENERAR CÓDIGO
    const randomCode =
      crypto.randomBytes(3).toString("hex");

    // TOKEN
    const token = jsonwebtoken.sign(
      {
        randomCode,

        img_url,
        img_public_id,

        name,
        last_name,
        dui,
        age,
        gender,
        phone,

        license_number,

        license_url,
        license_public_id,

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

    //COOKIE
    res.cookie("registrationCookie", token, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
    });

    //EMAIL
    const htmlContent =
      "Para verificar tu cuenta utiliza este código: " +
      randomCode +
      ". Expira en 15 minutos.";

    //Se envia el email
    try {
      await sendEmail(
        email,
        "Verificación de cuenta",
        htmlContent,
      );
    } catch (error) {
      console.log("error " + error);

      return res.status(500).json({
        message: "Error al enviar el correo",
      });
    }

    return res.status(200).json({
      message: "Correo de verificación enviado",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

//Verificar codigo
registerDoctorController.verifyCode =
  async (req, res) => {

    try {

      // CÓDIGO ESCRITO POR USUARIO
      const { verificationCodeRequest } =
        req.body;

      // TOKEN
      const token =
        req.cookies.registrationCookie;

      // DECODIFICAR TOKEN
      const decoded =
        jsonwebtoken.verify(
          token,
          config.JWT.secret,
        );

      const {
        randomCode: storedCode,

        img_url,
        img_public_id,

        name,
        last_name,
        dui,
        age,
        gender,
        phone,

        license_number,

        license_url,
        license_public_id,

        email,
        password,

        is_verified,
        loginAttempts,
        timeOut,
      } = decoded;

      //VALIDAR CODIGO
      if (
        verificationCodeRequest !==
        storedCode
      ) {
        return res.status(400).json({
          message: "Código inválido",
        });
      }

      // CREAR DOCTOR
      const newDoctor =
        new doctorsModel({
          img_url,
          img_public_id,

          name,
          last_name,
          dui,
          age,
          gender,
          phone,

          license_number,

          license_url,
          license_public_id,

          email,
          password,

          is_verified: true,

          loginAttempts,
          timeOut,
        });

      await newDoctor.save();

      //bORRAR COOKIE
      res.clearCookie("registrationCookie");

      return res.status(200).json({
        message: "Doctor registrado",
      });

    } catch (error) {

      console.log("error " + error);

      return res.status(500).json({
        message: "Error interno del servidor",
      });
    }
};

export default registerDoctorController;