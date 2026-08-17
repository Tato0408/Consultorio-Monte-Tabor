import { pdf } from "@react-pdf/renderer";
import ReportPDFDocument from "./components/ReportPDFDocument";

// Quita caracteres no permitidos en nombres de archivo de Windows, Mac y
// Linux.
const sanitizeFilename = (str) => str.replace(/[\\/:*?"<>|]/g, "").trim();

// Arma el nombre del archivo del PDF a partir del título del reporte:
// agrega el período (por ejemplo, del 01 de jul de 2026 al 26 de jul de
// 2026) o la palabra General cuando el reporte no tiene rango de fechas.
export const buildReportFilename = (pdfData) => {
  const { reportTitle, isGeneral, periodLabel } = pdfData;
  const suffix = isGeneral ? "General" : `del ${periodLabel}`;
  return sanitizeFilename(`${reportTitle} ${suffix}.pdf`);
};

// Genera el PDF con los mismos datos que ya están en pantalla (el mismo
// rango de fechas o el modo general activo) y dispara la descarga en el
// navegador.
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
