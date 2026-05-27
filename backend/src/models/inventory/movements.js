import { Schema, model } from "mongoose";

const movimientoSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["Uso en tratamiento", "Entrada de stock", "Ajuste de inventario", "Uso manual"],
      required: true,
    },
    insumo: {
      type: Schema.Types.ObjectId,
      ref: "insumos",
      required: true,
    },
    nombreInsumo: { type: String },               // desnormalizado para reportes
    cantidad:     { type: Number, required: true }, // negativo = salida, positivo = entrada
    detalle:      { type: String },
    usuario:      { type: String },
    paciente:     { type: String },
    fecha:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model("movements", movimientoSchema);
