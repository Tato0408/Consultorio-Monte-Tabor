// Complemento de seedInventoryProducts.js: a los productos de esa siembra que
// quedaron sin expiration_date (los que no suelen tener "caducidad" en la vida
// real, ej. protectores de colchón, escobas) se les asigna igual una fecha,
// a pedido explícito — para que la columna Caducidad de InventoryTable.jsx no
// quede vacía en ninguna fila. Solo toca documentos que ya existen y cuyo
// expiration_date es null (no pisa ninguna fecha ya asignada).
import mongoose from "mongoose";
import { config } from "../config.js";
import inventoryModel from "../src/models/inventory/inventory.js";

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const EXPIRATIONS = {
  "Vendas elásticas 3\"": daysFromNow(500),
  "Cinta micropore 2\"": daysFromNow(400),
  "Algodón hidrófilo 500g": daysFromNow(450),
  "Sábanas desechables camilla": daysFromNow(720),
  "Fundas de almohada desechables": daysFromNow(720),
  "Protectores de colchón": daysFromNow(900),
  "Cubrezapatos desechables": daysFromNow(600),
  "Gorros desechables quirúrgicos": daysFromNow(600),
  "Cubre camillas rollo": daysFromNow(720),
  "Guantes de nitrilo talla M": daysFromNow(550),
  "Batas quirúrgicas desechables": daysFromNow(650),
  "Gafas de protección": daysFromNow(1000),
  "Guantes de látex talla S": daysFromNow(550),
  "Guantes de látex talla L": daysFromNow(550),
  "Protector facial (careta)": daysFromNow(1000),
  "Detergente multiusos 1gal": daysFromNow(365),
  "Papel toalla industrial": daysFromNow(500),
  "Escobas y trapeadores": daysFromNow(1200),
};

async function run() {
  await mongoose.connect(config.db.URI);
  console.log("Conectado a la base de datos");

  let updated = 0;
  for (const [name, expiration_date] of Object.entries(EXPIRATIONS)) {
    const result = await inventoryModel.updateOne(
      { name, $or: [{ expiration_date: null }, { expiration_date: { $exists: false } }] },
      { $set: { expiration_date } }
    );
    if (result.modifiedCount > 0) {
      updated += 1;
      console.log(`Actualizado: ${name} -> ${expiration_date.toISOString().split("T")[0]}`);
    } else {
      console.log(`Sin cambios (no encontrado o ya tenía fecha): ${name}`);
    }
  }

  console.log(`\nListo. ${updated} productos actualizados.`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Error actualizando fechas de caducidad:", error);
  process.exit(1);
});
