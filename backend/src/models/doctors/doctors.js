import { Schema, model } from "mongoose";

const doctorSchema = new Schema(
  {
    img_url: {
      type: String,
      required: true,
    },
    img_public_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    dui: {
      type: String,
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    license_number: {
      type: String,
      required: true,
      unique: true,
    },
    license_url: {
      type: String,
      required: true,
    },
    license_public_id: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

export default model("Doctors", doctorSchema);