import { Schema, model } from "mongoose";

const permissionSchema = new Schema({
    moduleKey: { type: String, required: true },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
}, { _id: false });

const roleSchema = new Schema({
    roleKey: {
        type: String,
        required: true,
        unique: true,
        enum: ["admin", "doctor", "nurse", "receptionist"]
    },
    displayName: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    isProtected: { type: Boolean, default: false },
    permissions: { type: [permissionSchema], default: [] },
    updatedBy: { type: String }
}, {
    timestamps: true
});

export default model("Role", roleSchema, "roles");
