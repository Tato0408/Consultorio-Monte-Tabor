import mongoose from "mongoose";
import { config } from "./config.js";
import { initRoleCache } from "./src/services/roleCache.js";

mongoose.connect(config.db.URI);

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