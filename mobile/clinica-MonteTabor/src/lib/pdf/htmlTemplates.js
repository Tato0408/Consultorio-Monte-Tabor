// Plantillas HTML para expo-print (mismo motor de PDF que ya usa el panel privado y el
// portal web, adaptado a HTML/CSS porque @react-pdf/renderer no corre en React Native —
// expo-print renderiza HTML normal en un WebView y lo imprime a PDF).

import { LAB_ORDER_CATALOG, testKey } from "../labOrderCatalog";

const CLINIC_INFO = {
  name: "Clínica Familiar Monte Tabor",
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
export function buildIncapacidadHtml({ logoDataUri, patientName, dui, age, diagnosis, restDays, doctorName, date }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 40pt; }
  ${BASE_STYLES}
</style></head>
<body>
  ${letterhead(logoDataUri, false)}
  <div class="title">CONSTANCIA DE INCAPACIDAD MÉDICA</div>
  <div class="row"><span>Fecha: ${escapeHtml(date)}</span>${dui ? `<span>DUI: ${escapeHtml(dui)}</span>` : ""}</div>
  <p class="paragraph">Por este medio se hace constar que <span class="label">${escapeHtml(patientName)}</span>, de ${age ?? "—"} años de edad, fue atendido(a) en esta clínica y presenta:</p>
  <p class="diagnosis">${escapeHtml(diagnosis || "Sin diagnóstico registrado")}</p>
  <p class="paragraph">Por lo anterior, se indica reposo médico por <span class="label">${escapeHtml(restDays)}</span> día(s) a partir de la fecha.</p>
  <p class="paragraph">Y para los usos que estime convenientes, se extiende la presente en San Salvador Este, Distrito de Soyapango.</p>
  ${signature(doctorName, false)}
</body></html>`;
}

// Media carta (612 x 396pt, la mitad de una hoja LETTER), igual que la receta que ya
// genera el portal web (ver RecetaDocument.jsx).
export function buildRecetaHtml({ logoDataUri, patientName, dui, age, doctorName, date, medications = [], instructions }) {
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
  <div class="row"><span>Paciente: <span class="label">${escapeHtml(patientName)}</span></span><span>Fecha: ${escapeHtml(date)}</span></div>
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
