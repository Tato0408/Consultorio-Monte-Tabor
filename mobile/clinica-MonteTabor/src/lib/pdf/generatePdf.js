import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// expo-print renderiza el HTML a PDF y lo deja en un archivo temporal; expo-sharing abre
// la hoja nativa de compartir para que el paciente lo guarde, lo imprima o lo envíe —
// no existe un "descargar a la carpeta de descargas" único entre iOS y Android, compartir
// es el mecanismo estándar de Expo para esto.
//
// El tamaño de página se controla con las opciones width/height (en pt, 72 por pulgada) de
// printToFileAsync, NO con la regla CSS @page del HTML: iOS la ignora por completo (bug
// conocido de expo-print) y solo respeta estas opciones directas. Por defecto son 612x792
// (carta), que es justo lo que ya se quiere para la incapacidad, así que solo la receta
// (media carta) necesita pasarlas explícitas.
export async function generarYCompartirPdf(html, dialogTitle, { width, height } = {}) {
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  });

  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error("Este dispositivo no puede compartir archivos.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle,
    UTI: "com.adobe.pdf",
  });
}
