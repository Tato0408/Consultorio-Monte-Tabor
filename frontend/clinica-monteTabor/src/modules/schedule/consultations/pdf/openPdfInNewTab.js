import { pdf } from "@react-pdf/renderer";

// Genera el PDF a partir del elemento <Document> recibido y lo abre
// en una pestaña nueva del navegador, para que el usuario lo revise
// e imprima con el visor de PDF nativo, sin depender de window.print
// sobre el HTML de la pantalla.
export async function openPdfInNewTab(documentElement) {
    const blob = await pdf(documentElement).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
}
