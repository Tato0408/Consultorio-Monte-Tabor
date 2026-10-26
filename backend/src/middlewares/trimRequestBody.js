// Claves que nunca se recortan: las contraseñas se comparan tal cual se
// escribieron y cambiar eso podría dejar a alguien sin poder iniciar sesión.
const untouched_key = /password|contrasena/i;

/*
 * Quita los espacios al inicio y al final de todos los textos de un valor,
 * recorriendo objetos y arreglos anidados. Un texto hecho solo de espacios
 * queda como "", así las validaciones de campo vacío de cada controlador lo
 * rechazan igual que si no se hubiera escrito nada. Recibe el valor y la clave
 * con la que llegó, y devuelve el valor ya recortado.
 */
export const trim_strings = (value, key = "") => {
    if (typeof value === "string") return untouched_key.test(key) ? value : value.trim();
    if (Array.isArray(value)) return value.map((item) => trim_strings(item, key));
    // Objeto plano: el de express.json tiene prototipo Object y el de multer
    // no tiene prototipo. Fechas, ObjectId u otras clases se dejan intactas.
    const proto = value && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
    if (proto === Object.prototype || proto === null) {
        for (const [child_key, child_value] of Object.entries(value)) {
            value[child_key] = trim_strings(child_value, child_key);
        }
    }
    return value;
};

/*
 * Middleware que recorta los textos de req.body antes de llegar al
 * controlador. Se excluye el webhook de Wompi, que valida su firma con los
 * datos exactos que mandó la pasarela.
 */
export const trim_request_body = (req, res, next) => {
    if (!req.originalUrl.startsWith("/api/webhooks")) {
        req.body = trim_strings(req.body);
    }
    next();
};

export default trim_request_body;
