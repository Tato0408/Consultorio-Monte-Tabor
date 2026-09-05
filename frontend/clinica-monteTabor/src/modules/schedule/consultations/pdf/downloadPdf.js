import { pdf } from "@react-pdf/renderer";

// Genera el PDF a partir del elemento <Document> recibido y dispara su
// descarga con el nombre dado (a diferencia de openPdfInNewTab, que solo lo
// abre en una pestaña para revisarlo/imprimirlo).
export async function downloadPdf(documentElement, filename) {
    const blob = await pdf(documentElement).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Se libera en el siguiente tick: revocar de inmediato cancela la descarga
    // en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
