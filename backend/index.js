import "./timezone.js";
import http from "http";
import app from './app.js';
import "./database.js";
import { initRoleSocket } from "./src/services/roleSocket.js";

async function main() {
    // Se crea el http.Server a mano (en vez de app.listen directo) para
    // poder engancharle el WebSocketServer que avisa de cambios de permisos.
    const server = http.createServer(app);
    initRoleSocket(server);
    server.listen(4000, "0.0.0.0", () => console.log("Server on port 4000"))
}

main()
