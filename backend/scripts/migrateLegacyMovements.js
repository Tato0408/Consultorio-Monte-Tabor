// Migra los movimientos de inventario que quedaron con el esquema viejo en
// español (tipo/insumo/nombreInsumo/cantidad/detalle/usuario/paciente/fecha)
// al esquema actual en inglés (type/item/itemName/quantity/detail/user/
// patient/date, ver models/inventory/movements.js). El controlador actual
// lee los campos nuevos, así que estos 5 documentos aparecían en blanco
// (itemName/quantity/user sin valor) y con la fecha actual en vez de la
// real (date tiene default: Date.now, que Mongoose aplica al no encontrar
// ese campo). Traduce los datos ya reales que tenían en vez de
// reemplazarlos por algo inventado, y limpia los campos viejos.
import mongoose from "mongoose";
import { config } from "../config.js";
import movementModel from "../src/models/inventory/movements.js";

const TYPE_MAP = {
  "Uso manual": "Manual use",
  "Entrada de stock": "Stock entry",
  "Ajuste de inventario": "Inventory adjustment",
};

async function run() {
  await mongoose.connect(config.db.URI);
  console.log("Conectado a la base de datos");

  const legacy = await movementModel.find({ itemName: { $exists: false } }).lean();
  console.log(`Encontrados ${legacy.length} movimientos con el esquema viejo.`);

  for (const m of legacy) {
    const type = TYPE_MAP[m.tipo] || "Inventory adjustment";
    await movementModel.updateOne(
      { _id: m._id },
      {
        $set: {
          type,
          item: m.insumo,
          itemName: m.nombreInsumo,
          quantity: m.cantidad,
          detail: m.detalle,
          user: m.usuario,
          patient: m.paciente || null,
          date: m.fecha,
        },
        $unset: { tipo: "", insumo: "", nombreInsumo: "", cantidad: "", detalle: "", usuario: "", paciente: "", fecha: "" },
      }
    );
    console.log(`Migrado: ${m._id} -> ${type} / ${m.nombreInsumo} / ${m.cantidad}`);
  }

  console.log(`\nListo. ${legacy.length} movimientos migrados.`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Error migrando movimientos:", error);
  process.exit(1);
});
