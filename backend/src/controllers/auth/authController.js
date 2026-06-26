import nurseModel from "../../models/nurses/nurses.js"
import doctorModel from "../../models/doctors/doctors.js"
//agregar admin model
import recepcionistModel from "../../models/receptionist/receptionist.js"

const role_models = {
    //admin: adminModel
    doctor: doctorModel,
    nurse: nurseModel,
    recepctionist: recepcionistModel
};

const authController = {};

authController.getCurrentUser = async (req, res) => {
    try {
        const { id, userType } = req.user;

        const model = role_models[userType];
        if (!model) {
            return res.status(400).json({ message: "Invalid user type in token" });
        }

        const userFound = await model.findById(id).select("-password");

        if (!userFound) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            userType, user: { id: userFound._id, email: userFound.email, name: userFound.name, last_name: userFound.last_name },
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
export default authController;