import { Schema, model } from "mongoose";

const adminSchema = new Schema({
    name: {
        type: String
    },
    last_name: {
        type: String
    },
    dui: {
        type: String
    },
    birth_date: {
        type: Date
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    is_active: {
        type: Boolean
    },
    is_verified: {
        type: Boolean
    },
    public_id: {
        type: String
    },
    image: {
        type: String
    },
    loginAttempts: {
        type: Number
    },
    timeOut: {
        type: Date
    }
}, {
    timestamps: true,
    strict: false
});
export default model("Admin", adminSchema)