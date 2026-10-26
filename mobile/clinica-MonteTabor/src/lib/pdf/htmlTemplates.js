// Plantillas HTML para expo-print (mismo motor de PDF que ya usa el panel privado y el
// portal web, adaptado a HTML/CSS porque @react-pdf/renderer no corre en React Native —
// expo-print renderiza HTML normal en un WebView y lo imprime a PDF).

import { LAB_ORDER_CATALOG, testKey } from "../labOrderCatalog";

const CLINIC_INFO = {
  name: "Consultorio Médico Familiar Monte Tabor",
  address: "Barrio Concepción, Pasaje San Antonio, casa N.° 6, Distrito de Soyapango, Municipio de San Salvador Este",
  whatsapp: "7548-6791",
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const letterhead = (logoDataUri, compact) => `
  <div class="letterhead ${compact ? "compact" : ""}">
    ${logoDataUri ? `<img src="${logoDataUri}" class="logo" />` : ""}
    <div>
      <div class="clinicName">${CLINIC_INFO.name}</div>
      <div class="clinicDetail">${CLINIC_INFO.address}</div>
      <div class="clinicDetail">WhatsApp ${CLINIC_INFO.whatsapp}</div>
    </div>
  </div>
`;

const signature = (doctorName, compact) => `
  <div class="signature ${compact ? "compact" : ""}">
    <div class="signatureLine"></div>
    <div class="signatureLabel">${escapeHtml(doctorName || "Firma")}</div>
    ${compact ? "" : '<div class="seal">Sello médico:</div>'}
  </div>
`;

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; }
  .letterhead { display: flex; align-items: center; border-bottom: 2px solid #2F6BFF; padding-bottom: 8px; margin-bottom: 14px; }
  .letterhead.compact { padding-bottom: 5px; margin-bottom: 8px; }
  .logo { width: 44px; height: 44px; margin-right: 10px; }
  .letterhead.compact .logo { width: 32px; height: 32px; margin-right: 8px; }
  .clinicName { font-size: 14px; font-weight: 700; color: #2F6BFF; }
  .letterhead.compact .clinicName { font-size: 11px; }
  .clinicDetail { font-size: 8px; color: #475569; }
  .title { font-size: 13px; font-weight: 700; text-align: center; margin-bottom: 20px; text-decoration: underline; }
  .row { display: flex; justify-content: space-between; margin-bottom: 14px; }
  .label { font-weight: 700; }
  .paragraph { margin-bottom: 12px; line-height: 1.5; }
  .diagnosis { margin-bottom: 12px; line-height: 1.5; padding-left: 8px; }
  .signature { margin-top: 30px; display: flex; flex-direction: column; align-items: center; }
  .signature.compact { margin-top: 16px; }
  .signatureLine { border-top: 1px solid #1e293b; width: 200px; margin-bottom: 4px; }
  .signatureLabel { font-size: 9px; }
  .seal { font-size: 9px; margin-top: 16px; }
`;

// Mismo formato que ya emite el panel privado (ver IncapacidadDocument.jsx de
// clinica-monteTabor) y el portal web, para que la incapacidad que descarga el paciente
// desde la app sea idéntica a la que emite la clínica en cualquier otro lugar.
export function buildIncapacidadHtml({ logoDataUri, patientName, dui, age, diagnosis, restDays, doctorName, date, time }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 40pt; }
  ${BASE_STYLES}
</style></head>
<body>
  ${letterhead(logoDataUri, false)}
  <div class="title">CONSTANCIA DE INCAPACIDAD MÉDICA</div>
  <div class="row"><span>Fecha: ${escapeHtml(date)}${time ? `&nbsp;&nbsp;&nbsp;Hora: ${escapeHtml(time)}` : ""}</span>${dui ? `<span>DUI: ${escapeHtml(dui)}</span>` : ""}</div>
  <p class="paragraph">Por este medio se hace constar que <span class="label">${escapeHtml(patientName)}</span>, de ${age ?? "—"} años de edad, fue atendido(a) en esta clínica y presenta:</p>
  <p class="diagnosis">${escapeHtml(diagnosis || "Sin diagnóstico registrado")}</p>
  <p class="paragraph">Por lo anterior, se indica reposo médico por <span class="label">${escapeHtml(restDays)}</span> día(s) a partir de la fecha.</p>
  <p class="paragraph">Y para los usos que estime convenientes, se extiende la presente en San Salvador Este, Distrito de Soyapango.</p>
  ${signature(doctorName, false)}
</body></html>`;
}

// Media carta (612 x 396pt, la mitad de una hoja LETTER), igual que la receta que ya
// genera el portal web (ver RecetaDocument.jsx).
export function buildRecetaHtml({ logoDataUri, patientName, dui, age, doctorName, date, time, medications = [], instructions }) {
  const filasMedicamentos = medications
    .map(
      (m) => `
    <tr>
      <td><div>${escapeHtml(m.name || "—")}</div>${m.instructions ? `<div class="instructions">${escapeHtml(m.instructions)}</div>` : ""}</td>
      <td>${escapeHtml(m.dose || "—")}</td>
      <td>${escapeHtml(m.frequency || "—")}</td>
      <td>${escapeHtml(m.duration || "—")}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 18pt; }
  ${BASE_STYLES}
  body { font-size: 9px; }
  .title { font-size: 11.5px; margin-bottom: 10px; }
  .row { margin-bottom: 6px; }
  .sectionTitle { font-size: 9.5px; font-weight: 700; color: #2F6BFF; margin-top: 8px; margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; font-size: 7.5px; font-weight: 700; color: #475569; text-align: left; padding: 3px; }
  td { font-size: 8px; border-bottom: 1px solid #e2e8f0; padding: 3px; vertical-align: top; }
  .instructions { font-size: 7.5px; color: #64748b; }
</style></head>
<body>
  ${letterhead(logoDataUri, true)}
  <div class="title">RECETA MÉDICA</div>
  <div class="row"><span>Paciente: <span class="label">${escapeHtml(patientName)}</span></span><span>Fecha: ${escapeHtml(date)}${time ? `&nbsp;&nbsp;&nbsp;Hora: ${escapeHtml(time)}` : ""}</span></div>
  <div class="row"><span>Edad: ${age ?? "—"}</span>${dui ? `<span>DUI: ${escapeHtml(dui)}</span>` : ""}</div>
  ${medications.length ? `
  <div class="sectionTitle">Medicamentos</div>
  <table>
    <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
    <tbody>${filasMedicamentos}</tbody>
  </table>` : ""}
  ${instructions ? `<div class="sectionTitle">Indicaciones</div><p class="paragraph">${escapeHtml(instructions)}</p>` : ""}
  ${signature(doctorName, true)}
</body></html>`;
}

// Orden de laboratorio: reproduce el formato de casillas de la hoja de solicitud,
// con el membrete y la firma de Clínica Monte Tabor (igual que la receta y la
// incapacidad). Misma plantilla que ve el personal (LabOrderDocument.jsx).
const yesNoLab = (value) => (value === "si" ? "Sí" : value === "no" ? "No" : "—");

export function buildLabOrderHtml({
  logoDataUri,
  patientName,
  dui,
  age,
  gender,
  doctorName,
  date,
  time,
  weight,
  height,
  pregnancy,
  antibioticTreatment,
  tests = [],
  otherTests,
}) {
  const selected = new Set(tests);
  const columnas = LAB_ORDER_CATALOG.map((panel) => {
    const filas = panel.tests
      .map((test) => {
        const checked = selected.has(testKey(panel.key, test.key));
        return `<div class="labRow"><span class="labBox ${checked ? "checked" : ""}"></span><span class="${checked ? "labChecked" : ""}">${escapeHtml(test.label)}</span></div>`;
      })
      .join("");
    return `<div class="labCol"><div class="labPanelTitle">${escapeHtml(panel.title.toUpperCase())}</div>${filas}</div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 24pt; }
  ${BASE_STYLES}
  body { font-size: 8px; }
  .title { font-size: 12px; margin-bottom: 10px; }
  .labHeader { display: flex; flex-wrap: wrap; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 5px 0; margin-bottom: 8px; }
  .labHeaderItem { width: 25%; margin-bottom: 2px; padding-right: 4px; }
  .labHeaderLabel { font-size: 6.5px; color: #64748b; }
  .labHeaderValue { font-size: 8.5px; font-weight: 700; }
  .labCols { display: flex; flex-wrap: wrap; }
  .labCol { width: 20%; padding-right: 4px; margin-bottom: 6px; }
  .labPanelTitle { font-size: 7.5px; font-weight: 700; color: #2F6BFF; background: #eef3ff; padding: 1.5px 2px; margin-bottom: 2px; }
  .labRow { display: flex; align-items: flex-start; margin-bottom: 1.5px; font-size: 7px; }
  .labBox { display: inline-block; width: 6px; height: 6px; border: 0.8px solid #64748b; margin-right: 3px; margin-top: 1px; flex-shrink: 0; }
  .labBox.checked { background: #2F6BFF; border-color: #2F6BFF; }
  .labChecked { font-weight: 700; }
  .otros { margin-top: 6px; margin-bottom: 16px; font-size: 8px; }
</style></head>
<body>
  ${letterhead(logoDataUri, false)}
  <div class="title">ORDEN DE LABORATORIO</div>
  <div class="labHeader">
    <div class="labHeaderItem"><div class="labHeaderLabel">Fecha</div><div class="labHeaderValue">${escapeHtml(date || "—")}</div></div>
    ${time ? `<div class="labHeaderItem"><div class="labHeaderLabel">Hora</div><div class="labHeaderValue">${escapeHtml(time)}</div></div>` : ""}
    <div class="labHeaderItem"><div class="labHeaderLabel">Paciente</div><div class="labHeaderValue">${escapeHtml(patientName || "—")}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Edad</div><div class="labHeaderValue">${age != null ? `${age} años` : "—"}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Sexo</div><div class="labHeaderValue">${escapeHtml(gender || "—")}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">DUI</div><div class="labHeaderValue">${escapeHtml(dui || "—")}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Médico solicitante</div><div class="labHeaderValue">${escapeHtml(doctorName || "—")}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Peso (kg)</div><div class="labHeaderValue">${weight != null && weight !== "" ? escapeHtml(weight) : "—"}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Talla (cm)</div><div class="labHeaderValue">${height != null && height !== "" ? escapeHtml(height) : "—"}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Embarazo</div><div class="labHeaderValue">${yesNoLab(pregnancy)}</div></div>
    <div class="labHeaderItem"><div class="labHeaderLabel">Tratamiento antibiótico</div><div class="labHeaderValue">${yesNoLab(antibioticTreatment)}</div></div>
  </div>
  <div class="labCols">${columnas}</div>
  <div class="otros"><span class="label">OTROS: </span>${otherTests ? escapeHtml(otherTests) : "________________________________________________"}</div>
  ${signature(doctorName, false)}
</body></html>`;
}

// Referencia médica: reproduce el formato de la hoja del consultorio (campos
// estructurados) con el membrete y la firma de Clínica Monte Tabor. Misma
// plantilla que ve el personal (ReferenciaDocument.jsx).
const refVal = (v) => (v !== undefined && v !== null && String(v).trim() !== "" ? escapeHtml(v) : "—");

export function buildReferenciaHtml({
  logoDataUri,
  patientName,
  age,
  patientPhone,
  phone,
  referredDoctorAddress,
  referredDoctorPhone,
  date,
  time,
  referredTo,
  reason,
  bloodPressure,
  heartRate,
  respiratoryRate,
  spo2,
  physicalExam,
  icdCode,
  diagnosis,
  diagnosisDescription,
  doctorName,
}) {
  const impresion = [icdCode, diagnosis].filter(Boolean).join(" - ")
    + (diagnosisDescription ? `${icdCode || diagnosis ? ". " : ""}${diagnosisDescription}` : "");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 40pt; }
  ${BASE_STYLES}
  .refField { margin-bottom: 12px; line-height: 1.4; }
  .refBlock { margin-bottom: 12px; line-height: 1.5; padding-left: 6px; }
  .refVitals { margin-bottom: 8px; }
  .refVitals span { margin-right: 22px; }
</style></head>
<body>
  ${letterhead(logoDataUri, false)}
  <div class="title">REFERENCIA</div>

  <div class="refField"><span class="label">FECHA:</span> ${refVal(date)}${time ? `&nbsp;&nbsp;&nbsp;Hora: ${escapeHtml(time)}` : ""}</div>
  <div class="refField"><span class="label">NOMBRE:</span> ${refVal(patientName)}&nbsp;&nbsp;&nbsp;&nbsp;<span class="label">EDAD:</span> ${age != null ? `${age} años` : "—"}</div>
  <div class="refField"><span class="label">TELÉFONO DEL PACIENTE:</span> ${refVal(patientPhone ?? phone)}</div>
  <div class="refField"><span class="label">REFERIDO A:</span> ${refVal(referredTo)}</div>
  <div class="refField"><span class="label">DIRECCIÓN DEL DOCTOR REFERIDO:</span> ${refVal(referredDoctorAddress)}</div>
  <div class="refField"><span class="label">TELÉFONO DEL DOCTOR REFERIDO:</span> ${refVal(referredDoctorPhone)}</div>

  <div class="label">MOTIVO DE REFERENCIA:</div>
  <div class="refBlock">${refVal(reason)}</div>

  <div class="label">EXAMEN FÍSICO:</div>
  <div class="refVitals">
    <span><span class="label">PA:</span> ${refVal(bloodPressure)}</span>
    <span><span class="label">FC:</span> ${refVal(heartRate)}</span>
    <span><span class="label">FR:</span> ${refVal(respiratoryRate)}</span>
    <span><span class="label">SPO2%:</span> ${refVal(spo2)}</span>
  </div>
  <div class="refBlock">${refVal(physicalExam)}</div>

  <div class="label">IMPRESIÓN DIAGNOSTICADA:</div>
  <div class="refBlock">${impresion.trim() ? escapeHtml(impresion.trim()) : "—"}</div>

  ${signature(doctorName, false)}
</body></html>`;
}

// Historial clínico del paciente: signos vitales de todas las fechas,
// antecedentes de todo tipo y procedimientos realizados, en tablas tipo
// registro. Mismo documento que descarga el paciente desde la web
// (ClinicalHistoryDocument.jsx). Sin firma: es un extracto de datos ya
// registrados, no una constancia que emita un medico.
const histCell = (value) => {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "—";
};

const HIST_STYLES = `
  .histTitle { font-size: 13px; font-weight: 700; text-align: center; text-decoration: underline; letter-spacing: 0.5px; margin-bottom: 12px; }
  .idBand { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 8px 0; margin-bottom: 2px; }
  .idRow { display: flex; margin-top: 6px; }
  .idItem { flex: 1; padding-right: 6px; }
  .idLabel { font-size: 6.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  .idValue { font-size: 9.5px; font-weight: 700; color: #1e293b; }
  .secHead { border-bottom: 1px solid #2F6BFF; padding-bottom: 3px; margin-top: 16px; margin-bottom: 3px; }
  .secTitle { font-size: 10px; font-weight: 700; color: #2F6BFF; text-transform: uppercase; letter-spacing: 0.5px; }
  .secNote { font-size: 7px; color: #94a3b8; margin-bottom: 6px; line-height: 1.4; }
  .subHead { font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 4px; }
  .histProse { font-size: 9px; line-height: 1.5; color: #334155; }
  .ledger { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .ledger th { background: #f4f7fb; border-top: 1px solid #c9d8ea; border-bottom: 1px solid #c9d8ea; font-size: 6.5px; font-weight: 700; color: #5b6b7d; text-transform: uppercase; letter-spacing: 0.4px; padding: 5px; text-align: center; }
  .ledger th:first-child { text-align: left; }
  .ledger td { border-bottom: 1px solid #e8edf3; font-size: 8.5px; color: #334155; padding: 5px; text-align: center; }
  .ledger td:first-child { text-align: left; font-weight: 700; color: #0f2942; }
  .ledger tbody tr:nth-child(even) td { background: #fbfcfe; }
  .histFooter { display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 22px; font-size: 7px; color: #94a3b8; }
`;

export function buildClinicalHistoryHtml({
  logoDataUri,
  patientName,
  age,
  gender,
  dui,
  bloodType,
  birthDate,
  date,
  time,
  vitals = [],
  hereditary = [],
  pathological = [],
  nonPathological,
  ecologicalSocial,
  procedures = [],
}) {
  const vitalsRows = vitals.length
    ? vitals
        .map(
          (v) => `<tr><td>${histCell(v.fecha)}</td><td>${histCell(v.presion)}</td><td>${histCell(v.glucosa)}</td><td>${histCell(v.peso)}</td><td>${histCell(v.altura)}</td><td>${histCell(v.temp)}</td><td>${histCell(v.spo2)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:left;">Sin tomas de signos vitales registradas.</td></tr>`;

  const hereditaryRows = hereditary.length
    ? hereditary
        .map(
          (h) => `<tr><td>${histCell(h.parentesco)}</td><td style="text-align:left;font-weight:400;color:#334155;">${histCell(h.condicion)}</td><td style="text-align:left;font-weight:400;color:#334155;">${histCell(h.tipo)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="text-align:left;">—</td></tr>`;

  const pathologicalRows = pathological.length
    ? pathological
        .map(
          (p) => `<tr><td>${histCell(p.enfermedad)}</td><td style="text-align:left;font-weight:400;color:#334155;">${histCell(p.diagnostico)}</td><td style="text-align:left;font-weight:400;color:#334155;">${histCell(p.tipo)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="text-align:left;">—</td></tr>`;

  const proceduresRows = procedures.length
    ? procedures
        .map(
          (proc) => `<tr><td>${histCell(proc.nombre)}</td><td style="text-align:right;font-weight:400;color:#334155;">${histCell(proc.fecha)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="text-align:left;">—</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 32pt; }
  ${BASE_STYLES}
  ${HIST_STYLES}
</style></head>
<body>
  ${letterhead(logoDataUri, false)}
  <div class="histTitle">HISTORIAL CLÍNICO DEL PACIENTE</div>

  <div class="idBand">
    <div class="idItem"><div class="idLabel">Paciente</div><div class="idValue">${histCell(patientName)}</div></div>
    <div class="idRow">
      <div class="idItem"><div class="idLabel">Edad</div><div class="idValue">${histCell(age)}</div></div>
      <div class="idItem"><div class="idLabel">Sexo</div><div class="idValue">${histCell(gender)}</div></div>
      <div class="idItem"><div class="idLabel">DUI</div><div class="idValue">${histCell(dui)}</div></div>
      <div class="idItem"><div class="idLabel">Tipo de sangre</div><div class="idValue">${histCell(bloodType)}</div></div>
      <div class="idItem"><div class="idLabel">Fecha de nacimiento</div><div class="idValue">${histCell(birthDate)}</div></div>
    </div>
  </div>

  <div class="secHead"><span class="secTitle">1. Signos vitales</span></div>
  <div class="secNote">Todas las tomas registradas, de la más reciente a la más antigua. El IMC y su categoría se consultan en tu perfil.</div>
  <table class="ledger">
    <thead><tr><th>Fecha</th><th>Presión (mmHg)</th><th>Glucosa (mg/dL)</th><th>Peso (kg)</th><th>Talla (m)</th><th>Temp. (°C)</th><th>SpO2 (%)</th></tr></thead>
    <tbody>${vitalsRows}</tbody>
  </table>

  <div class="secHead"><span class="secTitle">2. Antecedentes</span></div>
  <div class="secNote">Antecedentes registrados, de todos los tipos.</div>

  <div class="subHead">Hereditarios</div>
  <table class="ledger">
    <thead><tr><th>Parentesco</th><th style="text-align:left;">Condición</th><th style="text-align:left;">Tipo</th></tr></thead>
    <tbody>${hereditaryRows}</tbody>
  </table>

  <div class="subHead">Patológicos</div>
  <table class="ledger">
    <thead><tr><th>Enfermedad</th><th style="text-align:left;">Diagnóstico</th><th style="text-align:left;">Tipo</th></tr></thead>
    <tbody>${pathologicalRows}</tbody>
  </table>

  <div class="subHead">No patológicos</div>
  <div class="histProse">${histCell(nonPathological)}</div>

  <div class="subHead">Ecológico-sociales</div>
  <div class="histProse">${histCell(ecologicalSocial)}</div>

  <div class="secHead"><span class="secTitle">3. Procedimientos realizados</span></div>
  <div class="secNote">Procedimientos con respaldo en una consulta atendida.</div>
  <table class="ledger">
    <thead><tr><th>Procedimiento</th><th style="text-align:right;">Fecha</th></tr></thead>
    <tbody>${proceduresRows}</tbody>
  </table>

  <div class="histFooter">
    <span>Consultorio Médico Familiar Monte Tabor · Expediente clínico</span>
    <span>Documento generado el ${histCell(date)}${time ? `, ${escapeHtml(time)}` : ""}</span>
  </div>
</body></html>`;
}
