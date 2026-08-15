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
    // Nombre del artículo, guardado de forma redundante para simplificar
    // los reportes.
    itemName:  { type: String },
    // Cantidad del movimiento: negativa si es salida, positiva si es entrada.
    quantity:  { type: Number, required: true },
    detail:    { type: String },
    user:      { type: String },
    patient:   { type: String },
    date:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model("movements", movementSchema);