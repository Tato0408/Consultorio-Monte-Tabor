import { Schema, model } from "mongoose";

const roleChangeLogSchema = new Schema({
    roleKey: { type: String, required: true },
    moduleKey: { type: String, required: true },
    action: {
        type: String,
        required: true,
        enum: ["view", "create", "update", "delete"]
    },
    previousValue: { type: Boolean, required: true },
    newValue: { type: Boolean, required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    batchId: { type: String }
});

export default model("RoleChangeLog", roleChangeLogSchema, "roleChangeLogs");
