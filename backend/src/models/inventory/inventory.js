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

    expiration_date: { type: Date},
    supplier:     { type: String },
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

// Días hasta el vencimiento (negativo si ya venció). null si el producto no
// tiene fecha de vencimiento registrada.
InventorySchema.virtual("expiryDays").get(function () {
  if (!this.expiration_date) return null;
  const diff = new Date(this.expiration_date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Estado de caducidad, independiente del estado de stock. Sin fecha de
// vencimiento se considera Vigente (no hay nada próximo a vencer que avisar).
InventorySchema.virtual("expiryStatus").get(function () {
  const days = this.expiryDays;
  if (days === null) return "Vigente";
  if (days <= 0) return "Caduco";
  if (days <= 30) return "Próximo a vencer";
  return "Vigente";
});

InventorySchema.set("toJSON", { virtuals: true });
InventorySchema.set("toObject", { virtuals: true });

export default model("inventory", InventorySchema);
