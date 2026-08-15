import Role from "../models/role/role.js";

// Tiempo de vida de la caché antes de refrescarse automáticamente (60
// segundos). Actúa como red de respaldo si el refresco puntual, al
// guardar un cambio, llegara a fallar.
const TTL_MS = 60 * 1000;

// Estado en memoria del módulo, vive mientras el proceso de Node esté
// corriendo.

// Mapa de roleKey a la lista de permisos de ese rol.
let cache = new Map();

// Referencia al setInterval del refresco automático, evita crear uno
// duplicado si initRoleCache() se llamara más de una vez.
let refreshTimer = null;

// Función privada, no exportada. Trae los roles de la base de datos y
// arma la caché desde cero.
async function loadFromDatabase() {
    // .lean() devuelve objetos JS planos en vez de documentos completos de
    // Mongoose, más rápido y liviano porque acá solo se lee, no se
    // modifica ni se guarda.
    const roles = await Role.find({}).lean();

    // Se arma una copia nueva y separada en vez de ir modificando "cache"
    // directamente.
    const nextCache = new Map();
    for (const role of roles) {
        // Si el documento no tuviera permissions por algún motivo, se
        // guarda un array vacío en vez de undefined, para que nada rompa
        // más adelante al leerlo.
        nextCache.set(role.roleKey, role.permissions || []);
    }

    // Reemplazo atómico. Recién acá, con la nueva versión ya completamente
    // armada, se pisa "cache" de una sola vez. Mientras se armaba
    // nextCache, cualquier request que llegara seguía viendo la versión
    // vieja pero completa, nunca un estado a medias.
    cache = nextCache;
}

// Se llama una única vez al arrancar el servidor, después de conectar
// a la base de datos.
export async function initRoleCache() {
    // Carga inicial. Se espera a que termine antes de que el servidor
    // empiece a atender pedidos.
    await loadFromDatabase();

    // Evita crear más de un setInterval si esta función se llamara más de
    // una vez por error.
    if (!refreshTimer) {
        refreshTimer = setInterval(() => {
            // Refresco automático de respaldo cada TTL_MS. Si falla, se
            // registra el error y la caché sigue con los datos que ya
            // tenía, para reintentar en el próximo ciclo.
            loadFromDatabase().catch((error) => {
                console.log("Error refrescando cache de roles: " + error);
            });
        }, TTL_MS);
    }
}

// Se llama puntualmente justo después de guardar un cambio de permisos,
// para que la caché quede al día al instante, sin esperar al próximo TTL.
export async function refreshRoleCache() {
    await loadFromDatabase();
}

// Lectura pura en memoria, sin await y sin base de datos. Esto es lo
// que hace rápida a authorize().
export function getRolePermissions(roleKey) {
    // Si el rol no existiera en la caché, devuelve un array vacío (sin
    // permisos) en vez de undefined. Ante la duda, no se deja pasar nada,
    // nunca se deja pasar todo por accidente.
    return cache.get(roleKey) || [];
}

// Función que authorize(moduleKey, accion) consulta en cada request.
export function getModulePermission(roleKey, moduleKey) {
    const permissions = getRolePermissions(roleKey);

    // Busca el objeto de permisos que coincida con ese moduleKey
    // específico. Si no existe ninguno (por ejemplo un módulo nuevo aún
    // no sembrado para ese rol), devuelve null en vez de undefined, para
    // que authorize() pueda chequearlo con un simple if (!permission).
    return permissions.find((permission) => permission.moduleKey === moduleKey) || null;
}
