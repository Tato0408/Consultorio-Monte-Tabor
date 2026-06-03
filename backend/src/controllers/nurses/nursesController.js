import nursesModel from "../../models/nurses/nurses.js"
import { v2 as cloudinary } from "cloudinary"
import * as nodemailer from 'nodemailer'
import crypto from 'crypto'
import jsonwebtoken from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from "../../../config.js"
const nursesController = {}

nursesController.getAllNurses = async (req, res) => {
    try {
        const response = await nursesModel.find();
        if (!response) {
            return res.status(404).json({ message: "Nurse not found" });
        }
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

nursesController.insertNurses = async (req, res) => {
    try {
        const {
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password
        } = req.body;

        const existNurse = await nursesModel.findOne({ email });
        if (existNurse) {
            return res.status(400).json({ message: "Nurse alredy exist" });
        }

        const passwordHashed = await bcrypt.hash(password, 10)

        const payload = new nursesModel({
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password: passwordHashed,
            is_active: true,
            is_verified: false,
            img_url: req.file.path,
            public_id: req.file.filename,
            time_out: null
        })
        const savedNurse = await payload.save()
        if (!savedNurse) {
            return res.status(500).json({ message: "Error while adding a nurse" })
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: config.email.user_email,
                pass: config.email.user_password
            }
        });

        const mailOptions = {
            from: config.email.user_email,
            to: email,
            subject: `Su cuenta de enfermera ha sido creada`,
            text: `Hola ${name} ${last_name}, su cuenta con el rol de enfermera ha sido creada exitosamente.
                Correo: ${email}
                Contraseña: ${password}
                Inicie sesión por primera vez dentro del sistema para cambiar su contraseña.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent: " + info.response);
            }
        });
        return res.status(200).json({ message: "Nurse added succesfuly" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

nursesController.deleteNurse = async (req, res) => {
    try {

        const response = await nursesModel.findById(req.params.id)
        const deleteImage = await cloudinary.uploader.destroy(response.public_id)
        if (!response) {
            return res.status(404).json({ message: "Nurse not found" })
        }
        if (!deleteImage) {
            const error = new Error("Error while deleting a nurse");
            return res.status(500).json({ message: "Internal Server error", error: error.message })
        }
        const nurseDeleted = await nursesModel.findByIdAndDelete(req.params.id)
        if(!nurseDeleted){
                const error = new Error("Error deleting a nurse");
                return res.status(500).json({message: "Internal Server error", error: error.message})
            }
        return res.status(200).json({ message: "Nurse deleted succesfuly" })
    } catch (error) {
        console.log(error)
        return res.staus(500).json({ message: "Internal Server error" })
    }
}

nursesController.updateNurse = async(req,res) => {
    try {
        const{
            name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password,
            is_active,
            time_out
        } = req.body

        const response = await nursesModel.findById(req.params.id)
        if(!response){
            return res.status(404).json({message: "Nurse not found"})
        }
        const payload = {
             name,
            last_name,
            dui,
            phone,
            birth_date,
            email,
            password: response.password,
            is_active,
            is_verified: response.is_verified,
            time_out: response.time_out
        }
        console.log("Llega acá")
        if(req.file){
            console.log(response)
            const updateImage = await cloudinary.uploader.destroy(response.public_id)
            console.log("Entra al primer if")
            if(!updateImage){
                const error = new Error("Error updating a nurse");
                return res.status(500).json({message: "Internal Server error", error: error.message})
                console.log("Error al eliminar la imagen")
            }
            payload.img_url = req.file.path
            payload.public_id = req.file.filename
        }
        const nurseUpdated = await nursesModel.findByIdAndUpdate(req.params.id, payload, { new: true })
        if(!nurseUpdated){
            const error = new Error("Error updatinf a nurse");
            return res.status(500).json({message: "Internal Server error", error: error.message})
        }
        return res.status(200).json({message: "Nurse updates succesfuly", nurse: nurseUpdated})
    } catch (error) {
        console.log("Error: ", error)
        return res.status(500).json({message: "Internal Server error"})
    }
}

export default nursesController;