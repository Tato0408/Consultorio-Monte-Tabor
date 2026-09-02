// Catálogo CIE-10 hardcodeado (no viene de BD ni de un servicio externo).
// El JSON crudo es el mismo archivo del backend (src/utils/cie10-codigos-planos.json),
// copiado acá y cargado por import() dinámico para que quede en su propio chunk y no
// engorde el bundle principal — solo se descarga al abrir el formulario de consulta.
// Formato del JSON: [{ "c": "A00", "d": "Cólera" }, ...] (~14.5k registros).

// Minúsculas y sin acentos, para que la búsqueda funcione escriba o no tildes.
const normalize = (value) =>
    (value || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

let catalogPromise = null;

// Carga (una sola vez por sesión) el catálogo y precalcula el texto de búsqueda
// de cada registro: código + descripción normalizados, para no rehacer ese
// trabajo en cada tecla.
export function loadCie10Catalog() {
    if (!catalogPromise) {
        catalogPromise = import("./cie10-codigos-planos.json").then((mod) => {
            const raw = mod.default || mod;
            return raw.map((entry) => ({
                c: entry.c,
                d: entry.d,
                _search: normalize(`${entry.c} ${entry.d}`),
            }));
        });
    }
    return catalogPromise;
}

// Filtro que usa el Combobox (base-ui): un registro coincide si CADA término de
// la búsqueda aparece en su código o en su descripción. Con query vacía coincide
// todo (el combobox aplica su propio `limit`).
export function cie10Filter(item, query) {
    const q = normalize(query).trim();
    if (!q) return true;
    const search = item?._search ?? normalize(`${item?.c} ${item?.d}`);
    return q.split(/\s+/).every((term) => search.includes(term));
}
