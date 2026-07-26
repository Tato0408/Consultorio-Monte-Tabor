import { pdf } from "@react-pdf/renderer";
import ReportPDFDocument from "./components/ReportPDFDocument";

// Quita caracteres no permitidos en nombres de archivo de Windows/Mac/Linux
const sanitizeFilename = (str) => str.replace(/[\\/:*?"<>|]/g, "").trim();

// "Reporte de Citas del 01 de jul 2026 - 26 de jul 2026.pdf" o "Reporte de Citas General.pdf"
export const buildReportFilename = (pdfData) => {
  const { reportTitle, isGeneral, periodLabel } = pdfData;
  const suffix = isGeneral ? "General" : `del ${periodLabel}`;
  return sanitizeFilename(`${reportTitle} ${suffix}.pdf`);
};

// Genera el PDF a partir de los mismos datos que ya están en pantalla (mismo rango de fecha
// o modo general activo) y dispara la descarga en el navegador.
export const exportReportPdf = async (pdfData) => {
  const blob = await pdf(<ReportPDFDocument data={pdfData} />).toBlob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = buildReportFilename(pdfData);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
