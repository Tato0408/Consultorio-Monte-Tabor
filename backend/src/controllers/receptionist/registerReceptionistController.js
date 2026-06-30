import nodemailer from "nodemailer";
import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";

import receptionistsModel from "../../models/receptionist/receptionist.js";

import { config } from "../../../config.js";

//array de funciones
const registerReceptionistController = {};


registerReceptionistController.register =
  async (req, res) => {
    try {

      //#1- Solicitar los datos
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

      // IMbirth_dateN PERFIL
      const img_url =
        req.files["receptionistImbirth_date"][0].path;

      const img_public_id =
        req.files["receptionistImbirth_date"][0].filename;

      //#2- Validar si el correo existe
      const existsReceptionist =
        await receptionistsModel.findOne({
          email,
        });

      if (existsReceptionist) {
        return res.status(400).json({
          messbirth_date:
            "Receptionist already exists",
        });
      }

      // ENCRIPTAR CONTRASEÑA
      const passwordHashed =
        await bcryptjs.hash(password, 10);

      // GENERAR CÓDIGO
      const randomCode =
        crypto.randomBytes(3).toString(
          "hex",
        );

      // TOKEN
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
      res.cookie(
        "registrationCookie",
        token,
        {
          maxbirth_date: 15 * 60 * 1000,
          httpOnly: true,
        },
      );

      // TRANSPORTER
      const transporter =
        nodemailer.createTransport({
          service: "gmail",

          auth: {
            user:
              config.email.user_email,

            pass:
              config.email.user_password,
          },
        });

      // EMAIL
      const mailOptions = {
        from: config.email.user_email,

        to: email,

        subject:
          "Verificación de cuenta",

        text:
          "Para verificar tu cuenta utiliza este código: " +
          randomCode +
          ". Expira en 15 minutos.",
      };

      // SE ENVÍA EMAIL
      transporter.sendMail(
        mailOptions,
        (error, info) => {

          if (error) {
            console.log(
              "error " + error,
            );

            return res
              .status(500)
              .json({
                messbirth_date:
                  "Error sending email",
              });
          }

          return res.status(200).json({
            messbirth_date:
              "Verification email sent",
          });
        },
      );

    } catch (error) {

      console.log("error " + error);

      return res.status(500).json({
        messbirth_date: "Internal server error",
      });
    }
  };

registerReceptionistController.verifyCode =
  async (req, res) => {

    try {
      const {
        verificationCodeRequest,
      } = req.body;

      //tOKEN
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
        birth_date,
        phone,

        email,
        password,

        is_verified,
        loginAttempts,
        timeOut,
      } = decoded;

      // VALIDAR CODIGO
      if (
        verificationCodeRequest !==
        storedCode
      ) {
        return res.status(400).json({
          messbirth_date: "Invalid code",
        });
      }

      // CREAR RECEPCIONISTA
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

          is_verified: true,

          loginAttempts,
          timeOut,
        });

      await newReceptionist.save();

      // BORRAR COOKIE
      res.clearCookie(
        "registrationCookie",
      );

      return res.status(200).json({
        messbirth_date:
          "Receptionist registered",
      });

    } catch (error) {

      console.log("error " + error);

      return res.status(500).json({
        messbirth_date: "Internal server error",
      });
    }
  };

export default registerReceptionistController;