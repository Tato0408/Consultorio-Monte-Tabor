import { Asset } from "expo-asset";
// La API nueva de expo-file-system (desde SDK 54+) ya no expone
// readAsStringAsync/EncodingType en la raíz del paquete (se reescribió a
// clases File/Directory sin un getter síncrono de base64); el subpath
// /legacy mantiene la API anterior tal cual, así que se usa acá para no
// reescribir esta única lectura puntual.
import * as FileSystem from "expo-file-system/legacy";

// El logo se embebe como data URI en el HTML del PDF (expo-print renderiza el HTML en un
// WebView aislado, sin acceso al sistema de archivos de la app, así que una ruta de
// archivo local no funcionaría ahí dentro). Se cachea en un módulo aparte porque
// convertirlo a base64 implica leer el archivo del disco, y el logo nunca cambia durante
// la vida de la app — no tiene sentido repetir esa lectura en cada PDF generado.
let logoPromise = null;

export function getLogoDataUri() {
  if (!logoPromise) {
    logoPromise = (async () => {
      const asset = Asset.fromModule(require("../../../assets/logoConsultorioSInFondo.png"));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    })().catch(() => null); // Sin logo no debe romper la generación del PDF, solo queda sin imagen.
  }
  return logoPromise;
}
