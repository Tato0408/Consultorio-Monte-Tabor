# Clínica Monte Tabor — ejecución en local

Todo el sistema corre en la PC: backend Node en el puerto 4000, MongoDB local, panel
privado en 5173 y portal del paciente en 5174. No depende de Render, Vercel ni Atlas.

## 1. MongoDB

MongoDB 8.2 está instalado pero no como servicio. Antes de iniciar el backend:

```powershell
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath C:\data\db --bind_ip 127.0.0.1
```

La base se llama `clinica_monte_tabor` (ver `DB_URI` en `backend/.env`).

## 2. Backend

```powershell
cd backend
npm install
node scripts/seedRoles.js             # solo la primera vez
node scripts/seedAppointmentTypes.js  # solo la primera vez
npm run dev
```

Copia `backend/.env.example` como `backend/.env` si no existe. Sin credenciales de
servicios externos el backend funciona en **modo local**:

| Servicio   | Sin credenciales en `.env`                                                 |
|------------|----------------------------------------------------------------------------|
| Cloudinary | Imágenes y documentos se guardan en `backend/uploads` y se sirven en `/uploads` |
| Gmail (nodemailer) | Si `USER_EMAIL` / `USER_PASSWORD` están vacíos, los correos (códigos de verificación, contraseñas) se imprimen en la consola del backend |
| Wompi      | Los pagos en línea no están disponibles (necesitan internet y credenciales)  |

Si llenas las credenciales de Cloudinary o de Gmail (`USER_EMAIL` y una contraseña de aplicación en `USER_PASSWORD`), se usan esos servicios.

El primer administrador se registra desde el panel privado; el código de verificación
aparece en la consola del backend.

## 3. Frontends

```powershell
cd frontend/clinica-monteTabor          # panel privado  -> http://localhost:5173
npm install
npm run dev

cd frontend/Clinica-monteTabor-publica  # portal paciente -> http://localhost:5174
npm install
npm run dev
```

Apuntan a `http://localhost:4000/api`. Para cambiarlo, crea un `.env.local` a partir de
`.env.example`.

## 4. App móvil (Expo)

`npx expo start` dentro de `mobile/clinica-MonteTabor`. La app detecta sola la IP de la
PC que corre Expo y llama al backend en el puerto 4000 de esa IP (el teléfono debe estar
en la misma red Wi-Fi). Para forzar otra URL: `EXPO_PUBLIC_API_URL=http://<ip>:4000/api`.
Para que el teléfono cargue las imágenes subidas, pon `BACKEND_PUBLIC_URL=http://<ip>:4000`
en `backend/.env`.

## Traer los datos que estaban en Atlas (opcional)

```powershell
mongodump --uri "<URI de Atlas>" --out C:\respaldo-monte-tabor
mongorestore --uri "mongodb://127.0.0.1:27017" --nsFrom "<base_atlas>.*" --nsTo "clinica_monte_tabor.*" C:\respaldo-monte-tabor
```

(`mongodump`/`mongorestore` vienen en las MongoDB Database Tools.) Las imágenes antiguas
seguirán cargándose desde sus URLs de Cloudinary mientras esa cuenta exista.
