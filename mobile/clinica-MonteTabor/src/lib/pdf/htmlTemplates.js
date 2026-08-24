// Plantillas HTML para expo-print (mismo motor de PDF que ya usa el panel privado y el
// portal web, adaptado a HTML/CSS porque @react-pdf/renderer no corre en React Native —
// expo-print renderiza HTML normal en un WebView y lo imprime a PDF).

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
  <div class="row"><span>Fecha: ${escapeHtml(date)}</span><span>DUI: ${escapeHtml(dui || "—")}</span></div>
  <p class="paragraph">Por este medio se hace constar que <span class="label">${escapeHtml(patientName)}</span>, de ${age ?? "—"} años de edad, fue atendido(a) en esta clínica y presenta:</p>
  <p class="diagnosis">${escapeHtml(diagnosis || "Sin diagnóstico registrado")}</p>
  <p class="paragraph">Por lo anterior, se indica reposo médico por <span class="label">${escapeHtml(restDays)}</span> día(s) a partir de la fecha.</p>
  <p class="paragraph">Y para los usos que estime convenientes, se extiende la presente en San Salvador Este, Distrito de Soyapango.</p>
  ${signature(doctorName, false)}
</body></html>`;
}

// Media carta (612 x 396pt, la mitad de una hoja LETTER), igual que la receta que ya
// genera el portal web (ver RecetaDocument.jsx).
export function buildRecetaHtml({ logoDataUri, patientName, dui, age, doctorName, date, medications = [], labOrders = [], instructions }) {
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

  const filasLab = labOrders
    .map((o) => `<p class="paragraph">- ${escapeHtml(o.test_name || "—")}${o.notes ? ` (${escapeHtml(o.notes)})` : ""}</p>`)
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
  <div class="row"><span>Edad: ${age ?? "—"}</span><span>DUI: ${escapeHtml(dui || "—")}</span></div>
  ${medications.length ? `
  <div class="sectionTitle">Medicamentos</div>
  <table>
    <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
    <tbody>${filasMedicamentos}</tbody>
  </table>` : ""}
  ${labOrders.length ? `<div class="sectionTitle">Órdenes de laboratorio</div>${filasLab}` : ""}
  ${instructions ? `<div class="sectionTitle">Indicaciones</div><p class="paragraph">${escapeHtml(instructions)}</p>` : ""}
  ${signature(doctorName, true)}
</body></html>`;
}
