import mongoose from "mongoose";
import { config } from "./config.js";
import { initRoleCache } from "./src/services/roleCache.js";

// Conecta a la base y, si la conexión inicial falla (Atlas saturado, corte
// de red), reintenta cada 5 segundos. Sin el catch, el rechazo de
// mongoose.connect quedaba sin manejar y tumbaba todo el servidor.
const connect_with_retry = () => {
    mongoose.connect(config.db.URI).catch((err) => {
        console.log("No se pudo conectar a la base de datos, se reintenta en 5 segundos: " + err.message);
        setTimeout(connect_with_retry, 5000);
    });
};
connect_with_retry();

const connection = mongoose.connection

connection.once("open", () => {
    console.log("Database is connected")
    // Carga la caché de roles y permisos en memoria una vez que la conexión
    // a la base de datos queda abierta, así authorize() no depende de la
    // base de datos en cada request.
    initRoleCache()
        .then(() => console.log("Cache de roles inicializada"))
        .catch((err) => console.log("Error inicializando cache de roles: " + err));
})

connection.on("disconnected", () => {
    console.log("Database is disconnected")
})

connection.on("error", (err) => {
    console.log("Error found: " + err)
})