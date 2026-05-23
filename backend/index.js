import app from './app.js';
import "./database.js";

//Creo una función para ejecutar el servidor 
async function main() {
    app.listen(4000)
    console.log("Server on port 4000")
}

main()