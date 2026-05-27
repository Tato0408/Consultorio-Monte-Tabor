import { Schema, model } from "mongoose";

const InventorySchema = new Schema(
  {
    name:         { type: String, required: true },
    description:  { type: String },
    category:     { type: String, required: true },
    stock:        { type: Number, required: true, default: 0 },
    unit_measure: { type: String, required: true },
    price:        { type: Number, default: 0 },
    min_stock:    { type: Number, required: true, default: 5 },

    expiration_date: { type: Date },
    supplier:     { type: String },
    image:        { type: String },        // URL Cloudinary
    image_public_id: { type: String },    // Public ID Cloudinary
    last_used:    { type: Date },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Estado calculado dinámicamente, no se guarda en BD
InventorySchema.virtual("status").get(function () {
  if (this.stock <= 0) return "Crítico";
  if (this.stock <= this.min_stock) return "Bajo";
  return "Disponible";
});

InventorySchema.set("toJSON", { virtuals: true });
InventorySchema.set("toObject", { virtuals: true });

export default model("inventory", InventorySchema);
