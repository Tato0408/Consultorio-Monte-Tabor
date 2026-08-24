import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

// El logo se embebe como data URI en el HTML del PDF (expo-print renderiza el HTML en un
// WebView aislado, sin acceso al sistema de archivos de la app, así que una ruta de
// archivo local no funcionaría ahí dentro). Se cachea en un módulo aparte porque
// convertirlo a base64 implica leer el archivo del disco, y el logo nunca cambia durante
// la vida de la app — no tiene sentido repetir esa lectura en cada PDF generado.
let logoPromise = null;

export function getLogoDataUri() {
  if (!logoPromise) {
    logoPromise = (async () => {
      const asset = Asset.fromModule(require("../../../assets/logoMonteTabor.png"));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    })().catch(() => null); // Sin logo no debe romper la generación del PDF, solo queda sin imagen.
  }
  return logoPromise;
}
