import patientsModel from "../../models/patients/patients.js";
import bcryptjs from "bcryptjs";
import { validateUserFieldFormats, getMissingRequiredField, getPasswordError } from "../../utils/validators.js";

//Array de funciones
const patientsController = {};

//Get de todos los pacientes
patientsController.getAllPatients = async (req, res) => {
  try {
    const patients = await patientsModel.find();
    return res.status(200).json(patients);
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Create
patientsController.createPatient = async (req, res) => {
  try {
    let { name, last_name, dui, birth_date, gender, phone, email, password, referred_by } = req.body;

    const requiredError = getMissingRequiredField(
      { name, last_name, dui, birth_date, gender, phone, email, password },
      ["name", "last_name", "dui", "birth_date", "gender", "phone", "email", "password"]
    );
    if (requiredError) {
      return res.status(400).json({ message: requiredError });
    }

    name = name.trim();
    last_name = last_name.trim();
    dui = dui.trim();
    phone = phone.trim();
    email = email.trim();
    password = password.trim();

    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
    if (formatError) {
      return res.status(400).json({ message: formatError });
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existsPatient = await patientsModel.findOne({ $or: [{ email }, { dui }] });
    if (existsPatient) {
      return res.status(400).json({ message: "El paciente ya existe" });
    }

    const passwordHashed = await bcryptjs.hash(password, 10);

    const newPatient = new patientsModel({
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
      password: passwordHashed,
      referred_by: referred_by ? referred_by.trim() : undefined,
      is_active: true,
      is_verified: true,
      loginAttemps: 0,
      timeOut: null,
    });

    const savedPatient = await newPatient.save();
    if (!savedPatient) {
      return res.status(500).json({ message: "Error al agregar el paciente" });
    }

    return res.status(200).json({ message: "Paciente agregado correctamente" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Delete
patientsController.deletePatient = async (req, res) => {
  try {
    //Buscamos el paciente por su id
    const deletedPatient = await patientsModel.findByIdAndDelete(req.params.id);
    //Si no coincide con ninguno entonces el paciente no existe
    if (!deletedPatient) {
      return res.status(400).json({ message: "Paciente no encontrado" });
    }
    //Si todo es correcto elimina el paciente
    return res.status(200).json({ message: "Paciente eliminado" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Update
patientsController.updatePatient = async (req, res) => {
  try {
    //#1 Solicitamos todos los datos a guardar
    let {
      //Campos singulares
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
      password,
      referred_by,
      is_active,
      is_verified,
      loginAttemps,
      timeOut,

      //Arrays
      new_vital_signs,
      new_pathological,
      new_hereditary,
      new_procedure,
    } = req.body;

    //Verificamos que el paciente exista, si no lanzara un error
    const patientFound = await patientsModel.findById(req.params.id);
    if (!patientFound) {
      return res.status(400).json({ message: "Paciente no encontrado" });
    }

    //Valida formato de los campos que vengan presentes (no exige que vengan todos, para no
    //romper actualizaciones parciales como agregar solo un signo vital o un procedimiento)
    const formatError = validateUserFieldFormats({ name, last_name, phone, email, dui, birth_date });
    if (formatError) {
      return res.status(400).json({ message: formatError });
    }

    //Campos singulares a actualizar
    const fieldsToSet = {};

    //Arrays a actualizar
    const fieldsToPush = {};

    //Validaciones que permiten que el update sea flexible validando cada campo puedo insertar datos o no, depende de lo que necesite actualizar

    //si mando el nombre le quita los espacios vacios, si no lo manda lo ignora por completo
    if (name !== undefined) {
      name = name.trim();
      if (name.length < 3)
        return res.status(400).json({ message: "El nombre es demasiado corto" });
      fieldsToSet.name = name;
    }

    //si mando el apellido le quita los espacios vacios, si no lo manda lo ignora por completo
    if (last_name !== undefined) {
      fieldsToSet.last_name = last_name.trim();
    }

    //si mando el dui le quita los espacios vacios, si no lo manda lo ignora por completo
    if (dui !== undefined) {
      fieldsToSet.dui = dui.trim();
    }

    //si mando la fecha de nacimiento le quita los espacios vacios, si no lo manda lo ignora por completo
    if (birth_date !== undefined) {
      fieldsToSet.birth_date = birth_date;
    }

    //si mando el genero le quita los espacios vacios, si no lo manda lo ignora por completo
    if (gender !== undefined) {
      fieldsToSet.gender = gender;
    }

    //si mando el telefono le quita los espacios vacios, si no lo manda lo ignora por completo
    if (phone !== undefined) {
      fieldsToSet.phone = phone.trim();
    }

    //si mando el email le quita los espacios vacios, si no lo manda lo ignora por completo
    if (email !== undefined) {
      fieldsToSet.email = email.trim();
    }

    //si mando la contraseña le quita los espacios vacios, si no lo manda lo ignora por completo
    if (password && password.trim() !== "") {
      const passwordError = getPasswordError(password.trim());
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }
      fieldsToSet.password = await bcryptjs.hash(password, 10);
    }

    //si mando la referencia le quita los espacios vacios, si no lo manda lo ignora por completo
    if (referred_by !== undefined) {
      fieldsToSet.referred_by = referred_by;
    }

    //Envia el campo tal cual lo agruege sin cambios, si no lo ignora
    if (is_active !== undefined) {
      fieldsToSet.is_active = is_active;
    }

    //Envia el campo tal cual lo agruege sin cambios, si no lo ignora
    if (is_verified !== undefined) {
      fieldsToSet.is_verified = is_verified;
    }

    //Envia el campo tal cual lo agruege sin cambios, si no lo ignora
    if (loginAttemps !== undefined) {
      fieldsToSet.loginAttemps = loginAttemps;
    }

    //Envia el campo tal cual lo agruege sin cambios, si no lo ignora
    if (timeOut !== undefined) {
      fieldsToSet.timeOut = timeOut;
    }

    //Envia antecedentes no patológicos, los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    if (req.body.non_pathological !== undefined) {
      fieldsToSet["clinical_history.non_pathological"] =
        req.body.non_pathological;
    }
    //Envia el tipo de sangre, los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    if (req.body.blood_type !== undefined) {
      fieldsToSet["clinical_history.blood_type"] = req.body.blood_type;
    }

    //Envia los signos vitales, los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    //Usamos el fieldsToPush porque es una lista de datos
    if (new_vital_signs) {
      fieldsToPush["clinical_history.vital_signs"] = {
        blood_pressure: new_vital_signs.blood_pressure,
        glucosa_mgdl: new_vital_signs.glucosa_mgdl,
        weight: new_vital_signs.weight,
        height: new_vital_signs.height,
        imc: new_vital_signs.imc,
        temperature: new_vital_signs.temperature,
        spo2: new_vital_signs.spo2,
        last_date_taken: new_vital_signs.last_date_taken || new Date(),
      };
    }

    //Envia los antecedentes patologicos, los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    //Usamos el fieldsToPush porque es una lista de datos
    if (new_pathological) {
      fieldsToPush["clinical_history.pathological"] = {
        disease: new_pathological.disease,
        diagnosis: new_pathological.diagnosis,
      };
    }

    //Envia los antecedentes hereditarios los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    //Usamos el fieldsToPush porque es una lista de datos
    if (new_hereditary) {
      fieldsToPush["clinical_history.hereditary"] = {
        relationship: new_hereditary.relationship,
        condition: new_hereditary.condition,
      };
    }

    //Envia los procedimientos, los prepara usando comillas y puntos para que MongoDB actualice solo esa casilla interna y no borre los demás datos médicos, si no los mandó, los ignora por completo
    //Usamos el fieldsToPush porque es una lista de datos
    if (new_procedure) {
      fieldsToPush["clinical_history.procedures"] = {
        procedure_id: new_procedure.procedure_id,
        procedure_name: new_procedure.procedure_name,
        consultation_id: new_procedure.consultation_id,
        doctor_id: new_procedure.doctor_id,
        doctor_name: new_procedure.doctor_name,
        date: new_procedure.date || new Date(),
        diagnosis: new_procedure.diagnosis,
        result: new_procedure.result,
        follow_up_date: new_procedure.follow_up_date,
      };
    }

    const patientData = {};

    //Object.keys() es un método  que sirve para extraer todos los nombres de las propiedades (las claves o "keys") de un objeto y devolverlos en un array de cadenas de texto (strings).

    // Si hay datos que sobrescribir en campos singulares
    if (Object.keys(fieldsToSet).length > 0) {
      patientData.$set = fieldsToSet;
    }

    // Si hay datos que acumular en las listas del historial
    if (Object.keys(fieldsToPush).length > 0) {
      patientData.$push = fieldsToPush;
    }

    // Si no enviaron absolutamente nada en el body
    if (Object.keys(patientData).length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar" });
    }

    //Si todo esta correcto actualizamos
    const patientUpdated = await patientsModel.findByIdAndUpdate(
      //Pedimos el id del paciente
      req.params.id,
      //Pedimos la informacion a actualizar del paciente
      patientData,
      {
        //Usamos esto en lugar de new:true ya que la consola tira una advertencia de que quedara defasada por la siguiente forma de escribirlo
        returnDocument: "after",
      }
    );
    //Si no se realiza la actualizacion significa que el paciente no existe
    if (!patientUpdated) {
      return res.status(400).json({ message: "Paciente no encontrado" });
    }
    //Si todo ha sido correcto actualizara la informacion enviada del paciente
    return res.status(200).json({ message: "Paciente actualizado" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default patientsController;
