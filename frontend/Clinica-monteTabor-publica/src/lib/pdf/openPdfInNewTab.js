import { pdf } from "@react-pdf/renderer";

// Genera el PDF a partir del elemento <Document> recibido y lo abre en una pestaña
// nueva del navegador, para que el paciente lo revise e imprima con el visor de PDF
// nativo. Mismo mecanismo que ya usa el panel privado (ver openPdfInNewTab.js de
// clinica-monteTabor).
export async function openPdfInNewTab(documentElement) {
  const blob = await pdf(documentElement).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
