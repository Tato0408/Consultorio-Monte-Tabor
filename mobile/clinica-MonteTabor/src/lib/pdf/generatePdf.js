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

  // NOTA: expo-print + expo-sharing (compartir/descargar el PDF) no funciona de forma
  // confiable dentro de Expo Go — Expo Go sandboxea cada proyecto por separado, y el archivo
  // que expo-print deja en el cacheDir crudo de Android queda fuera de lo que ese sandbox
  // permite leer, incluso para una simple copia (se probó y falla igual). Esto solo se
  // resuelve probando con un development build propio (eas build --profile development, o
  // "npx expo run:android"/"run:ios"), donde el proyecto ya no comparte sandbox con nada más.
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error("Este dispositivo no puede compartir archivos.");
  }
  try {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
  } catch (error) {
    // Se deja en consola el error completo (incluye el stack nativo), visible en la terminal
    // donde corre "expo start" — el toast de abajo solo alcanza a mostrar un mensaje corto.
    console.error("Error al compartir el PDF:", error);

    // Bug conocido de expo-sharing en Android: el módulo nativo solo libera su estado
    // "compartiendo" cuando Android confirma que la hoja de compartir se cerró
    // (onActivityResult). En ciertos dispositivos/versiones esa confirmación nunca llega, y
    // el módulo queda atascado — desde ahí CUALQUIER intento de compartir vuelve a fallar
    // con este mismo error hasta cerrar la app por completo, sin que nada de este lado (JS)
    // pueda resetearlo, porque el estado vive en el módulo nativo, no en esta app. Se
    // detecta por el texto del error (expo-sharing no expone un código propio para esto) y
    // se avisa con una instrucción clara en vez de dejar pasar el mensaje técnico crudo.
    const message = String(error?.message || "");
    if (/being processed/i.test(message)) {
      throw new Error("Hay una ventana de compartir que quedó pendiente. Cierra la app por completo y vuelve a abrirla, luego intenta descargar de nuevo.");
    }
    // Ver la nota de arriba: dentro de Expo Go, el archivo del PDF queda fuera del sandbox
    // que expo-sharing puede leer. No hay forma de evitarlo desde este código.
    if (/not allowed to read file/i.test(message)) {
      throw new Error("Descargar documentos no funciona dentro de Expo Go por una limitación de sandboxing. Pruébalo desde un development build (eas build --profile development).");
    }
    throw new Error(`No se pudo abrir el diálogo para compartir el documento: ${message || "error desconocido"}`);
  }
}
