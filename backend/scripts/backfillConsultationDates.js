import mongoose from "mongoose";
import { config } from "../config.js";
import Consultation from "../src/models/consultations/consultation.js";

// Migración puntual e idempotente. El campo "date" de Consultations nunca se
// completaba al crear una consulta (quedaba undefined para siempre); con
// eso, una referencia sin fecha propia (referral.referred_date) tampoco
// tenía de dónde heredarla —lo que el paciente veía en su portal como una
// referencia sin fecha—, y el ordenamiento por fecha de consulta en el
// portal del paciente (fetchConsultations, .sort({ date: -1 })) era un
// no-op porque todas las consultas empataban en undefined.
//
// insertConsultation/updateConsultation/updateReferral ya se corrigieron
// para las consultas nuevas (ver consultationController.js); este script
// rellena las que ya existían en la base de datos:
//   1) date -> createdAt (la fecha real en que se guardó la consulta).
//   2) referral.referred_date -> esa misma date, solo si la referencia
//      tiene motivo (o sea, se usó de verdad) y todavía no tiene su
//      propia fecha.
//
// Correr dos veces deja el mismo resultado.
//
// Uso: node backend/scripts/backfillConsultationDates.js

async function run() {
  await mongoose.connect(config.db.URI);
  console.log("Conectado a la base de datos");

  // Paso 1: consultas sin date todavía (el caso general, cubre casi todo lo
  // que ya existe en la base).
  const withoutDate = await Consultation.find({
    $or: [{ date: { $exists: false } }, { date: null }],
  }).select("date createdAt referral");

  console.log(`Consultas sin date: ${withoutDate.length}`);

  let updated = 0;
  for (const consultation of withoutDate) {
    const resolvedDate = consultation.createdAt || new Date();
    consultation.date = resolvedDate;
    if (consultation.referral?.reason && !consultation.referral.referred_date) {
      consultation.referral.referred_date = resolvedDate;
    }
    await consultation.save();
    updated += 1;
  }
  console.log(`Consultas actualizadas: ${updated}`);

  // Paso 2: consultas que ya tenían date, pero cuya referencia (con motivo)
  // se quedó sin referred_date porque el doctor la dejó en blanco.
  const referralsWithoutDate = await Consultation.find({
    "referral.reason": { $exists: true, $ne: "" },
    $or: [{ "referral.referred_date": { $exists: false } }, { "referral.referred_date": null }],
  }).select("date createdAt referral");

  let referralsFixed = 0;
  for (const consultation of referralsWithoutDate) {
    consultation.referral.referred_date = consultation.date || consultation.createdAt || new Date();
    await consultation.save();
    referralsFixed += 1;
  }
  console.log(`Referencias sin fecha corregidas: ${referralsFixed}`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Error en la migración:", error);
  process.exit(1);
});
