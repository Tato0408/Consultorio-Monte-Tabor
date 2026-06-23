import { Schema, model } from "mongoose";

const movementSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Treatment use", "Stock entry", "Inventory adjustment", "Manual use"],
      required: true,
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: "inventory",
      required: true,
    },
    itemName:  { type: String },               // denormalized for reports
    quantity:  { type: Number, required: true }, // negative = output, positive = input
    detail:    { type: String },
    user:      { type: String },
    patient:   { type: String },
    date:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model("movements", movementSchema);