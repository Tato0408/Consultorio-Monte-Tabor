// Inserción única de productos/insumos de ejemplo, para que la tabla de
// Inventario (InventoryTable.jsx) no se vea con un espacio en blanco tan
// grande debajo de pocas filas reales. Usa $setOnInsert con upsert por
// nombre, así que correrlo más de una vez no duplica nada.
import mongoose from "mongoose";
import { config } from "../config.js";
import inventoryModel from "../src/models/inventory/inventory.js";

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const PRODUCTS = [
  // Curación
  { name: "Gasas estériles 10x10cm", category: "Curación", stock: 240, min_stock: 50, unit_measure: "paquetes", price: 1.25, supplier: "Droguería San Nicolás", expiration_date: daysFromNow(420) },
  { name: "Vendas elásticas 3\"", category: "Curación", stock: 80, min_stock: 20, unit_measure: "unidades", price: 1.8, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },
  { name: "Apósitos hidrocoloides", category: "Curación", stock: 15, min_stock: 20, unit_measure: "unidades", price: 3.5, supplier: "INSUMED S.A. de C.V.", expiration_date: daysFromNow(600) },
  { name: "Cinta micropore 2\"", category: "Curación", stock: 60, min_stock: 15, unit_measure: "rollos", price: 0.95, supplier: "Droguería San Nicolás", expiration_date: null },
  { name: "Algodón hidrófilo 500g", category: "Curación", stock: 34, min_stock: 10, unit_measure: "bolsas", price: 2.1, supplier: "Farmacéutica Centroamericana", expiration_date: null },
  { name: "Suero fisiológico 250ml", category: "Curación", stock: 0, min_stock: 30, unit_measure: "frascos", price: 1.4, supplier: "MedSupply El Salvador", expiration_date: daysFromNow(300) },

  // Protección
  { name: "Sábanas desechables camilla", category: "Protección", stock: 150, min_stock: 40, unit_measure: "unidades", price: 0.6, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },
  { name: "Fundas de almohada desechables", category: "Protección", stock: 90, min_stock: 30, unit_measure: "unidades", price: 0.3, supplier: "Droguería San Nicolás", expiration_date: null },
  { name: "Protectores de colchón", category: "Protección", stock: 12, min_stock: 15, unit_measure: "unidades", price: 4.75, supplier: "INSUMED S.A. de C.V.", expiration_date: null },
  { name: "Cubrezapatos desechables", category: "Protección", stock: 200, min_stock: 50, unit_measure: "pares", price: 0.15, supplier: "MedSupply El Salvador", expiration_date: null },
  { name: "Gorros desechables quirúrgicos", category: "Protección", stock: 25, min_stock: 30, unit_measure: "unidades", price: 0.2, supplier: "Farmacéutica Centroamericana", expiration_date: null },
  { name: "Cubre camillas rollo", category: "Protección", stock: 18, min_stock: 8, unit_measure: "rollos", price: 6.2, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },

  // Desinfección
  { name: "Alcohol en gel 70% 1L", category: "Desinfección", stock: 45, min_stock: 15, unit_measure: "litros", price: 3.9, supplier: "Química Clínica S.A.", expiration_date: daysFromNow(540) },
  { name: "Alcohol isopropílico 500ml", category: "Desinfección", stock: 8, min_stock: 10, unit_measure: "frascos", price: 2.6, supplier: "Farmacéutica Centroamericana", expiration_date: daysFromNow(20) },
  { name: "Hipoclorito de sodio 5L", category: "Desinfección", stock: 20, min_stock: 6, unit_measure: "garrafas", price: 5.5, supplier: "Química Clínica S.A.", expiration_date: daysFromNow(200) },
  { name: "Clorhexidina solución 4%", category: "Desinfección", stock: 30, min_stock: 10, unit_measure: "frascos", price: 4.1, supplier: "MedSupply El Salvador", expiration_date: daysFromNow(365) },
  { name: "Toallitas desinfectantes", category: "Desinfección", stock: 5, min_stock: 12, unit_measure: "paquetes", price: 3.2, supplier: "Droguería San Nicolás", expiration_date: daysFromNow(90) },
  { name: "Yodopovidona solución 120ml", category: "Desinfección", stock: 40, min_stock: 12, unit_measure: "frascos", price: 2.3, supplier: "INSUMED S.A. de C.V.", expiration_date: daysFromNow(-15) },

  // Procedimiento
  { name: "Jeringas 5ml", category: "Procedimiento", stock: 500, min_stock: 100, unit_measure: "unidades", price: 0.08, supplier: "MedSupply El Salvador", expiration_date: daysFromNow(700) },
  { name: "Jeringas 10ml", category: "Procedimiento", stock: 320, min_stock: 80, unit_measure: "unidades", price: 0.1, supplier: "MedSupply El Salvador", expiration_date: daysFromNow(700) },
  { name: "Agujas hipodérmicas 21G", category: "Procedimiento", stock: 60, min_stock: 100, unit_measure: "unidades", price: 0.05, supplier: "INSUMED S.A. de C.V.", expiration_date: daysFromNow(500) },
  { name: "Guantes de nitrilo talla M", category: "Procedimiento", stock: 22, min_stock: 20, unit_measure: "cajas", price: 6.8, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },
  { name: "Catéteres intravenosos 22G", category: "Procedimiento", stock: 75, min_stock: 25, unit_measure: "unidades", price: 0.45, supplier: "Farmacéutica Centroamericana", expiration_date: daysFromNow(450) },
  { name: "Tubos de ensayo con EDTA", category: "Procedimiento", stock: 4, min_stock: 15, unit_measure: "unidades", price: 0.35, supplier: "Química Clínica S.A.", expiration_date: daysFromNow(250) },

  // EPI
  { name: "Mascarillas N95", category: "EPI", stock: 180, min_stock: 50, unit_measure: "unidades", price: 0.9, supplier: "MedSupply El Salvador", expiration_date: daysFromNow(730) },
  { name: "Batas quirúrgicas desechables", category: "EPI", stock: 60, min_stock: 30, unit_measure: "unidades", price: 1.6, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },
  { name: "Gafas de protección", category: "EPI", stock: 14, min_stock: 15, unit_measure: "unidades", price: 3.0, supplier: "INSUMED S.A. de C.V.", expiration_date: null },
  { name: "Guantes de látex talla S", category: "EPI", stock: 0, min_stock: 20, unit_measure: "cajas", price: 5.9, supplier: "Droguería San Nicolás", expiration_date: null },
  { name: "Guantes de látex talla L", category: "EPI", stock: 35, min_stock: 20, unit_measure: "cajas", price: 5.9, supplier: "Droguería San Nicolás", expiration_date: null },
  { name: "Protector facial (careta)", category: "EPI", stock: 28, min_stock: 10, unit_measure: "unidades", price: 2.4, supplier: "Farmacéutica Centroamericana", expiration_date: null },

  // Limpieza
  { name: "Detergente multiusos 1gal", category: "Limpieza", stock: 26, min_stock: 8, unit_measure: "galones", price: 4.5, supplier: "Química Clínica S.A.", expiration_date: null },
  { name: "Bolsas rojas desechos biológicos", category: "Limpieza", stock: 10, min_stock: 25, unit_measure: "paquetes", price: 3.8, supplier: "MedSupply El Salvador", expiration_date: null },
  { name: "Papel toalla industrial", category: "Limpieza", stock: 55, min_stock: 15, unit_measure: "rollos", price: 1.1, supplier: "Distribuidora Médica Salvadoreña", expiration_date: null },
  { name: "Limpiador de superficies 1L", category: "Limpieza", stock: 32, min_stock: 10, unit_measure: "litros", price: 2.9, supplier: "Química Clínica S.A.", expiration_date: daysFromNow(-5) },
  { name: "Escobas y trapeadores", category: "Limpieza", stock: 9, min_stock: 6, unit_measure: "unidades", price: 4.2, supplier: "Droguería San Nicolás", expiration_date: null },
  { name: "Desinfectante de pisos 5L", category: "Limpieza", stock: 16, min_stock: 6, unit_measure: "garrafas", price: 6.9, supplier: "Química Clínica S.A.", expiration_date: daysFromNow(180) },
];

async function seedInventoryProducts() {
  await mongoose.connect(config.db.URI);
  console.log("Conectado a la base de datos");

  let created = 0;
  let skipped = 0;
  for (const p of PRODUCTS) {
    const result = await inventoryModel.updateOne(
      { name: p.name },
      { $setOnInsert: p },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      created += 1;
      console.log(`Creado: ${p.name}`);
    } else {
      skipped += 1;
      console.log(`Ya existía, sin tocar: ${p.name}`);
    }
  }

  console.log(`\nListo. ${created} productos creados, ${skipped} ya existían.`);
  await mongoose.disconnect();
}

seedInventoryProducts().catch((error) => {
  console.error("Error insertando productos:", error);
  process.exit(1);
});
