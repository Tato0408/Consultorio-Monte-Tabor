import Role from "../models/role/role.js";

// Tiempo de vida de la cache antes de refrescarse automáticamente "por las dudas" (60 segundos).
// Actúa como red de respaldo si el refresco puntual (al guardar un cambio) llegara a fallar.
const TTL_MS = 60 * 1000;

// Estado en memoria del módulo: vive mientras el proceso de Node esté corriendo.
let cache = new Map(); // roleKey -> permissions[]
let refreshTimer = null; // referencia al setInterval, para no crear uno duplicado

// Función privada (no exportada): trae los roles de la base de datos y arma la cache desde cero.
async function loadFromDatabase() {
    // .lean() devuelve objetos JS planos en vez de documentos completos de Mongoose,
    // más rápido y liviano porque acá solo leemos, no modificamos ni guardamos.
    const roles = await Role.find({}).lean();

    // Se arma una copia nueva y separada en vez de ir modificando "cache" en el lugar.
    const nextCache = new Map();
    for (const role of roles) {
        // Si el documento no tuviera permissions por algún motivo, se guarda un array vacío
        // en vez de undefined, para que nada rompa más adelante al leerlo.
        nextCache.set(role.roleKey, role.permissions || []);
    }

    // Reemplazo atómico: recién acá, con la nueva versión ya completamente armada,
    // se pisa "cache" de una sola vez. Mientras se armaba nextCache, cualquier request
    // que llegara seguía viendo la versión vieja pero completa — nunca un estado a medias.
    cache = nextCache;
}

// Se llama una única vez al arrancar el servidor, después de conectar a la base de datos.
export async function initRoleCache() {
    // Carga inicial: se espera a que termine antes de que el servidor empiece a atender pedidos.
    await loadFromDatabase();

    // Evita crear más de un setInterval si esta función se llamara más de una vez por error.
    if (!refreshTimer) {
        refreshTimer = setInterval(() => {
            // Refresco automático de respaldo cada TTL_MS. Si falla, se loggea y se sigue:
            // la cache se queda con los datos que ya tenía, y se reintenta en el próximo ciclo.
            loadFromDatabase().catch((error) => {
                console.log("Error refrescando cache de roles: " + error);
            });
        }, TTL_MS);
    }
}

// Se llama puntualmente justo después de guardar un cambio de permisos,
// para que la cache quede al día al instante, sin esperar al próximo TTL.
export async function refreshRoleCache() {
    await loadFromDatabase();
}

// Lectura pura en memoria: sin await, sin base de datos. Esto es lo que hace rápido a authorize().
export function getRolePermissions(roleKey) {
    // Si el rol no existiera en la cache, devuelve array vacío (= sin permisos) en vez de
    // undefined. Ante la duda, no dejar pasar nada, nunca dejar pasar todo por accidente.
    return cache.get(roleKey) || [];
}

// La función que en la práctica consulta authorize(moduleKey, accion) en cada request.
export function getModulePermission(roleKey, moduleKey) {
    const permissions = getRolePermissions(roleKey);

    // Busca el objeto de permisos que coincida con ese moduleKey específico.
    // Si no existe ninguno (ej. un módulo nuevo aún no sembrado para ese rol), devuelve null
    // en vez de undefined, para que authorize() pueda chequearlo con un simple if (!permission).
    return permissions.find((permission) => permission.moduleKey === moduleKey) || null;
}