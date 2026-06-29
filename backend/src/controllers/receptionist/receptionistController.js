import receptionistsModel from "../../models/receptionist/receptionist.js";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcryptjs";
//Array de funciones
const receptionistController = {};

receptionistController.getReceptionists = async (req, res) => {
  try {
    const receptionists =
      await receptionistsModel.find();

    return res.status(200).json(receptionists);

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

receptionistController.createReceptionist =
  async (req, res) => {
    try {
      const {
        name,
        last_name,
        dui,
        age,
        phone,
        email,
        password,
      } = req.body;

      const receptionistExists =
        await receptionistsModel.findOne({
          $or: [
            { email },
            { dui },
          ],
        });

      if (receptionistExists) {
        return res.status(400).json({
          message:
            "Ya existe un recepcionista con ese correo o DUI",
        });
      }

      const passwordHashed =
        await bcryptjs.hash(
          password,
          10
        );

      const newReceptionist =
        new receptionistsModel({
          img_url:
            req.files[
              "receptionistImage"
            ][0].path,

          img_public_id:
            req.files[
              "receptionistImage"
            ][0].filename,

          name,
          last_name,
          dui,
          age,
          phone,
          email,

          password:
            passwordHashed,

          is_active: true,
          is_verified: true,
          loginAttempts: 0,
        });

      await newReceptionist.save();

      return res.status(201).json({
        message:
          "Recepcionista creado correctamente",
      });
    } catch (error) {
      console.log("error " + error);

      return res.status(500).json({
        message:
          "Internal server error",
      });
    }
  };

receptionistController.updateReceptionist = async (
  req,
  res,
) => {
  try {
    const {
      name,
      last_name,
      dui,
      age,
      phone,
      email,
      password,
      is_active,
      is_verified,
    } = req.body;

    const receptionistFound =
      await receptionistsModel.findById(
        req.params.id,
      );

    if (!receptionistFound) {
      return res.status(404).json({
        message: "Receptionist not found",
      });
    }

    const updatedData = {
      name,
      last_name,
      dui,
      age,
      phone,
      email,
      password,
      is_active,
      is_verified,
    };

    // NUEVA FOTO PERFIL
    if (req.files?.receptionistImage) {

      // borrar imagen anterior
      if (receptionistFound.img_public_id) {
        await cloudinary.uploader.destroy(
          receptionistFound.img_public_id,
        );
      }

      updatedData.img_url =
        req.files["receptionistImage"][0].path;

      updatedData.img_public_id =
        req.files["receptionistImage"][0].filename;
    }

    await receptionistsModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true },
    );

    return res.status(200).json({
      message: "Receptionist updated",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

receptionistController.deleteReceptionist =
  async (req, res) => {
    try {

      const receptionistFound =
        await receptionistsModel.findById(
          req.params.id,
        );

      if (!receptionistFound) {
        return res.status(404).json({
          message: "Receptionist not found",
        });
      }

      // BORRAR FOTO PERFIL
      if (receptionistFound.img_public_id) {
        await cloudinary.uploader.destroy(
          receptionistFound.img_public_id,
        );
      }

      // BORRAR DOCUMENTO
      await receptionistsModel.findByIdAndDelete(
        req.params.id,
      );

      return res.status(200).json({
        message: "Receptionist deleted",
      });

    } catch (error) {
      console.log("error " + error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };

export default receptionistController;