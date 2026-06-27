import bcrypt from "bcryptjs";
import jsonwebtoken from 'jsonwebtoken';
import { config } from '../../../../config.js';
import patientModel from './../../../models/patients/patients.js';

const loginController = {}

loginController.login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        email = email?.trim()
        password = password?.trim()

        const response = await patientModel.findOne({ email })
        if (!response) {
            return res.status(400).json({ message: "Invalid email or password." });
        }
        const isMatch = await bcrypt.compare(password, response.password);
        if (!isMatch) {
            response.loginAttemps = (response.loginAttemps || 0) + 1;

            //Si el contador llega a 5 se bloquea por 15 minutos
            if (response.loginAttemps >= 5) {
                response.timeOut = Date.now() + 1000 * 60 * 15; // 15 minutos
                response.loginAttemps = 0;
                await response.save();
                return res.status(400).json({ message: "User is locked" });
            }

            //Si fallo pero el contador aun no es 5, solo se guarda el contador de intentos
            await response.save();
            return res.status(400).json({ message: "Wrong password" });
        }
        response.loginAttemps = 0;
        response.timeOut = null;
        await response.save();
        const token = jsonwebtoken.sign(
            { id: response._id, userType: "patient" },
            config.JWT.secret,
            { expiresIn: "15m" }
        );

        res.cookie("authCookie", token);
        return res.status(200).json({
            message: "Login successful",
            token,
            userType : "patient",
            user: {
                id: response._id,
                email: response.email,
                name: response.name,
                last_name: response.last_name,
            },
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export default loginController;
