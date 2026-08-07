import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";

import { config } from "../../../config.js";

import doctorModel from "../../models/doctors/doctors.js";


const loginDoctorController = {};

loginDoctorController.login = async (req, res) => {
  try {
    //#1- Solicitar los datos
    const { email, password } = req.body;

    //Verificar si el correo existe en la base de datos
    const doctorFound = await doctorModel.findOne({ email });

    //Si no existe el correo
    if (!doctorFound) {
      return res.status(400).json({ message: "Doctor no encontrado" });
    }

    //Verificamos que la cuenta no esté bloqueada
    if (doctorFound.timeOut && doctorFound.timeOut > Date.now()) {
      return res.status(403).json({ message: "Blocked account" });
    }

    //Validar la contraseña
    const isMatch = await bcrypt.compare(password, doctorFound.password);

    //Si la contraseña está incorrecta
    if (!isMatch) {
      //Sumar 1 a la cantidad de intentos fallidos
      doctorFound.loginAttemps = (doctorFound.loginAttemps || 0) + 1;

      if (doctorFound.loginAttemps >= 5) {
        doctorFound.timeOut = Date.now() + 5 * 60 * 1000;
        doctorFound.loginAttemps = 0;

        await doctorFound.save();

        return res
          .status(403)
          .json({ message: "Blocked account for many attemps" });
      }

      await doctorFound.save();

      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    //Reseteamos intentos si el login es correcto
    doctorFound.loginAttemps = 0;
    doctorFound.timeOut = null;

    //Generar el token
    const token = jsonwebtoken.sign(
      //#1- ¿que vamos a guardar?
      { id: doctorFound._id, userType: "doctor" },
      //#2- secret key
      config.JWTsecret,
      //#3- Cuando expira
      { expiresIn: "30d" },
    );

    //El token lo guardamos en una cokie
    res.cookie("authCookie", token, {maxAge: 30 * 24 * 60 * 60 * 1000});

    return res.status(200).json({ message: "Login successfully" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginDoctorController;