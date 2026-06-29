import doctorsModel from "../../models/doctors/doctors.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";

// Array de funciones
const doctorController = {};

// =====================
// GET ALL
// =====================
doctorController.getDoctors = async (req, res) => {
  try {
    const doctors = await doctorsModel.find();

    return res.status(200).json(doctors);
  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//create
doctorController.createDoctor = async (req, res) => {
  try {
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

    const doctorExists =
      await doctorsModel.findOne({
        $or: [
          { email },
          { dui },
          { license_number },
        ],
      });

    if (doctorExists) {
      return res.status(400).json({
        message:
          "Ya existe un doctor con ese correo, DUI o licencia",
      });
    }

    const passwordHashed =
      await bcryptjs.hash(password, 10);

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

// =====================
// UPDATE
// =====================
doctorController.updateDoctors = async (req, res) => {
  try {
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

    const doctorFound =
      await doctorsModel.findById(
        req.params.id
      );

    if (!doctorFound) {
      return res.status(404).json({
        message:
          "Doctor not found",
      });
    }

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
    if (req.files?.doctorImage) {
      await cloudinary.uploader.destroy(
        doctorFound.img_public_id
      );

      updatedData.img_url =
        req.files["doctorImage"][0].path;

      updatedData.img_public_id =
        req.files["doctorImage"][0].filename;
    }

    // FOTO LICENCIA
    if (req.files?.licenseImage) {
      await cloudinary.uploader.destroy(
        doctorFound.license_public_id
      );

      updatedData.license_url =
        req.files["licenseImage"][0].path;

      updatedData.license_public_id =
        req.files["licenseImage"][0].filename;
    }

    await doctorsModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    return res.status(200).json({
      message:
        "Doctor updated",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
};

// =====================
// DELETE
// =====================
doctorController.deleteDoctor = async (req, res) => {
  try {
    const doctorFound =
      await doctorsModel.findById(
        req.params.id
      );

    if (!doctorFound) {
      return res.status(404).json({
        message:
          "Doctor not found",
      });
    }

    // BORRAR FOTO PERFIL
    await cloudinary.uploader.destroy(
      doctorFound.img_public_id
    );

    // BORRAR FOTO LICENCIA
    await cloudinary.uploader.destroy(
      doctorFound.license_public_id
    );

    // BORRAR DOCUMENTO
    await doctorsModel.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      message:
        "Doctor deleted",
    });

  } catch (error) {
    console.log("error " + error);

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
};


doctorController.updateOwnProfile = async (req, res) => {
  try {
    const doctorId = req.user.id; 

    const doctorFound = await doctorsModel.findById(doctorId);

    if (!doctorFound) {
      return res.status(404).json({
        message: "Doctor profile not found",
      });
    }

    // Solo extraemos campos personales. Excluimos 'is_active', 'is_verified' y 'license_number' por seguridad.
    const {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    } = req.body;

    const updatedData = {
      name,
      last_name,
      dui,
      birth_date,
      gender,
      phone,
      email,
    };

    if (req.files?.doctorImage) {
      if (doctorFound.img_public_id) {
        await cloudinary.uploader.destroy(doctorFound.img_public_id);
      }
      updatedData.img_url = req.files["doctorImage"][0].path;
      updatedData.img_public_id = req.files["doctorImage"][0].filename;
    }

    if (req.files?.licenseImage) {
      if (doctorFound.license_public_id) {
        await cloudinary.uploader.destroy(doctorFound.license_public_id);
      }
      updatedData.license_url = req.files["licenseImage"][0].path;
      updatedData.license_public_id = req.files["licenseImage"][0].filename;
    }

    const profileUpdated = await doctorsModel.findByIdAndUpdate(
      doctorId,
      updatedData,
      { new: true }
    );

    return res.status(200).json({
      message: "Your profile has been updated successfully",
      user: profileUpdated
    });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({
      message: "Internal server error updating your profile",
    });
  }
};

export default doctorController;