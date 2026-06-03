import bcrypt from "bcryptjs";
import jsonwebtoken from 'jsonwebtoken'
import {config } from '../../../config.js'
import nurseModel from '../../models/nurses/nurses.js'
import doctorModel from '../../models/doctors/doctors.js'

const loginController = {}
let userType = " "
loginController.loginCommonRole = async(req,res) => {
    try{
        const {email, password} = req.body
        const nurseFound = await nurseModel.findOne({email})

        const doctorFound = await doctorModel.findOne({email})
        //Si no es ni enfermera ni doctor
        if (!nurseFound && !doctorFound){
            return res.status(400).json({message: "User not found"})
        }
        //Si no encuentra nadaen en enfermeras, userType = doctor
        if(!nurseFound){
            userType = "doctor"
            if(doctorFound.time_out && doctorFound.time_out > Date.now()){
            return res.status(400).json({message: "User is locked"})
        }
        if(doctorFound.time_out && doctorFound.time_out > Date.now()){
            return res.status(400).json({message: "User is locked"})
        }
        const isMatch = await bcrypt.compare(password, doctorFound.password)
        if (!isMatch){
            doctorFound.loginAttemps = (doctorFound.loginAttemps || 0) + 1
            if(userType === "doctor" && doctorFound.loginAttemps >= 5){
                doctorFound.time_out = Date.now() + 1000 * 60 * 15 // 15 minutes
                doctorFound.loginAttemps = 0
                await doctorFound.save()
                return res.status(400).json({message: "User is locked"})
            }
            await doctorFound.save()
            return res.status(400).json({message: "Wrong password"})
        }
        doctorFound.loginAttemps = 0
        doctorFound.time_out = null
        await doctorFound.save()

        const token = jsonwebtoken.sign(
            {id: doctorFound._id, userType},
             config.JWT.secret, 
             {expiresIn: "15m"}
        );
        res.cookie("authCookie", token)
        return res.status(200).json({message: "Login successful",
             token,
             
            data: doctorFound })
 }


        //Si no encuentra nadaen en doctores, userType = nurse
        //Se hace todo el proceso del login pero para enfermeras
        if(!doctorFound){
            userType = "nurse"
            if(nurseFound.time_out && nurseFound.time_out > Date.now()){
            return res.status(400).json({message: "User is locked"})
        }
        if(nurseFound.time_out && nurseFound.time_out > Date.now()){
            return res.status(400).json({message: "User is locked"})
        }
        const isMatch = await bcrypt.compare(password, nurseFound.password)
        if (!isMatch){
            nurseFound.loginAttemps = (nurseFound.loginAttemps || 0) + 1
            if(userType === "nurse" && nurseFound.loginAttemps >= 5){
                nurseFound.time_out = Date.now() + 1000 * 60 * 15 // 15 minutes
                nurseFound.loginAttemps = 0
                await nurseFound.save()
                return res.status(400).json({message: "User is locked"})
            }
            await nurseFound.save()
            return res.status(400).json({message: "Wrong password"})
        }
        nurseFound.loginAttemps = 0
        nurseFound.time_out = null
        await nurseFound.save()

        const token = jsonwebtoken.sign(
            {id: nurseFound._id, userType},
             config.JWT.secret, 
             {expiresIn: "15m"}
        );
        res.cookie("authCookie", token) 
        return res.status(200).json({message: "Login successful", 
            token, 
            data: nurseFound})
        }
    }
    catch(error){
        console.log(error)
        return res.status(500).json({message: "Internal server error"})
    }
}

export default loginController;