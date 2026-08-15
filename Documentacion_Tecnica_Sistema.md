# Clínica Monte Tabor — Documentación técnica del sistema

Documento de preparación técnica: funcionamiento real de backend y frontend por módulo, partes difíciles de cada uno, el código exacto detrás de cada punto, y preguntas que un instructor podría hacer en una defensa. Todo basado en lectura directa del código fuente (no en supuestos) al 2026-07-05.

> **Cómo convertir esto a PDF**: abre el archivo en VSCode con la extensión "Markdown PDF" y exporta, o usa `pandoc Documentacion_Tecnica_Sistema.md -o Documentacion_Tecnica_Sistema.pdf`.

---

## Tabla resumen — qué está realmente conectado a backend

| Módulo | Backend real | Frontend | Estado |
|---|---|---|---|
| Horarios y citas (Calendario) | ✅ Completo | ✅ Completo | Funcional, con huecos de seguridad/concurrencia (ver §1) |
| Inventario | ✅ Completo | ✅ Completo | Funcional, con race conditions en stock (ver §2) |
| Dashboard Admin / Doctor | ✅ Completo (agregaciones Mongo reales) | ✅ Completo | Funcional |
| Dashboard Enfermera / Recepcionista | ❌ No existe | ❌ Componente vacío (crashea) | Sin implementar |
| Procedimientos | ✅ Completo (CLAUDE.md desactualizado) | ✅ Completo | Funcional |
| Tratamientos | ❌ No existe | ⚠️ Mock (`treatmentsData.js`) | Solo maqueta visual |
| Reportes (citas, pacientes, doctores, inventario) | ❌ No existe | ⚠️ Mock (`reportsData.js`) | Solo maqueta visual |

---

## 1. Módulo Calendario (Horarios y Citas)

### 1.1 Cómo funciona — Backend

Dos colecciones separadas colaboran:

- **`Schedules`** (`backend/src/models/schedule/schedule.js`): un documento por doctor con `weekly_availability` (bloques horarios por día 0-6), `breaks` (descansos recurrentes), `exceptions` (vacaciones/días especiales), `buffer_time` entre citas.
- **`Appointments`** (`backend/src/models/appointments/appointments.js`): cada cita con `doctor_id`, `patient_id`, `date`, `start_time`/`end_time` como strings `"HH:mm"`, `status`.

**Flujo completo al agendar una cita**: el frontend primero pide `GET /api/schedule/:doctorId/slots?date=&duration=` para saber qué horas están libres; el usuario elige una; al enviar el formulario se hace `POST /api/appointments` con esa hora ya "congelada" en el payload. El backend nunca vuelve a cruzar esos dos pasos (ver punto 4 de "partes difíciles").

### 1.2 Partes difíciles — con el código exacto

**1. ID mismatch de doctor.** El `user.id` del JWT puede diferir del `_id` real en la colección `doctors` porque hay doctores duplicados en la base. La función que lo resuelve:

```js
// backend/src/controllers/schedule/scheduleController.js:9-25
const findScheduleByDoctorId = async (doctorId) => {
    let schedule = await scheduleModel.findOne({ doctor_id: doctorId });
    if (schedule) return schedule;

    const requestedDoctor = await doctorModel.findById(doctorId).select("name last_name").lean();
    if (!requestedDoctor) return null;

    const sameNameDoctors = await doctorModel
        .find({ name: requestedDoctor.name, last_name: requestedDoctor.last_name })
        .select("_id")
        .lean();

    if (sameNameDoctors.length <= 1) return null;

    const ids = sameNameDoctors.map(d => d._id);
    return scheduleModel.findOne({ doctor_id: { $in: ids } });
};
```

El frontend hace el mismo tipo de reconciliación por su cuenta, buscando el doctor por `email` en vez de confiar en el `id` del JWT:

```js
// frontend/.../schedule/appointments/pages/ScheduleConfig.jsx:49-58
useEffect(() => {
    if (!user?.email) return;
    fetch("http://localhost:4000/api/doctors")
        .then(r => r.json())
        .then(list => {
            const me = Array.isArray(list) ? list.find(d => d.email === user.email) : null;
            setDoctorId(me?._id || user?.id || null);
        })
        .catch(() => setDoctorId(user?.id || null));
}, [user]);
```

**2. Timezone.** Nunca se usa `new Date("2026-07-05")` directo porque en El Salvador (UTC-6) esa fecha se interpreta como medianoche UTC y al convertir a local se corre un día atrás. En vez de eso, todo se parsea manualmente:

```js
// backend/src/controllers/schedule/scheduleController.js:69-71
const [yr, mo, dy] = date.split("-").map(Number);
const localDate  = new Date(yr, mo - 1, dy);
const dayOfWeek  = localDate.getDay(); // 0=Dom, 1=Lun, ...
```

```js
// backend/src/controllers/schedule/scheduleController.js:76-86  (comparación de excepciones)
const toDateStr = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d.split("T")[0];
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
};
const exception = schedule.exceptions.find(ex => {
    if (ex.end_date) {
        return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
    }
    return toDateStr(ex.date) === date;
});
```

**3. Algoritmo de generación de slots** (el núcleo de todo el sistema de citas):

```js
// backend/src/controllers/schedule/scheduleController.js:123-156
const slots = [];

for (const block of dayConfig.time_blocks) {
    const [startH, startM] = block.start_time.split(":").map(Number);
    const [endH,   endM]   = block.end_time.split(":").map(Number);
    let current = startH * 60 + startM;
    const end   = endH   * 60 + endM;

    while (current + durationMin <= end) {
        const hh  = String(Math.floor(current / 60)).padStart(2, "0");
        const mm  = String(current % 60).padStart(2, "0");
        const slotEnd = current + durationMin;
        const hhe = String(Math.floor(slotEnd / 60)).padStart(2, "0");
        const mme = String(slotEnd % 60).padStart(2, "0");

        const inBreak = schedule.breaks.some(br => {
            if (br.day !== dayOfWeek) return false;
            const [bh, bm] = br.start_time.split(":").map(Number);
            const [eh, em] = br.end_time.split(":").map(Number);
            const bStart = bh * 60 + bm;
            const bEnd   = eh * 60 + em;
            return current < bEnd && slotEnd > bStart;
        });

        const isBooked = bookedRanges.some(r => current < r.end && slotEnd > r.start);

        if (!inBreak && !isBooked) {
            slots.push({ start_time: `${hh}:${mm}`, end_time: `${hhe}:${mme}` });
        }

        current += durationMin + bufferMin;
    }
}
```

Nota clave para defender el caso límite del buffer: la condición del `while` (`current + durationMin <= end`) se evalúa **antes** de generar cada slot, así que un buffer grande nunca produce un slot que se salga del bloque — simplemente hace que se generen menos slots.

**4. Sin revalidación de concurrencia.** Esto es lo más importante de defender bien. `insertAppointment` valida campos y tipos, pero **nunca vuelve a comprobar disponibilidad**:

```js
// backend/src/controllers/appointments/appointmentsController.js:306-378 (resumido)
appointmentsController.insertAppointment = async (req, res) => {
    // ... valida doctor_id, patient_id, type, date, start_time, end_time,
    //     duration_minutes, status, total, longitud de description ...
    // ... valida status contra validStatus ...

    const newAppointment = new appointmentsModel({ doctor_id, patient_id, nurse_id, procedure_id,
        schedule_id, type, date, start_time, end_time, duration_minutes, description, status, total,
        cancellation_reason });

    await newAppointment.save();   // <-- no hay ninguna consulta de solapamiento aquí
    return res.status(201).json({ message: "Appointment created successfully" });
};
```

Compáralo con `getAvailableSlots`, que sí calcula solapamientos (`bookedRanges.some(...)`) pero solo se ejecuta en el `GET` anterior — nada obliga a que ese cálculo se repita en el `POST`.

**5. Autorización incompleta.** El middleware solo valida el rol, nunca la identidad del recurso:

```js
// backend/app.js:71 y 68
app.use("/api/schedule", validateAuthCookie(["admin", "doctor"]), scheduleRoutes);
app.use("/api/appointments", validateAuthCookie(["admin", "doctor", "receptionist"]), appointmentsRoutes);
```

```js
// backend/src/middlewares/authMiddleware.js:18-23
if (allowedTypes.length > 0 && !allowedTypes.includes(decoded.userType)) {
    return res.status(401).json({ message: "Acces denied" });
}
req.user = decoded;   // <-- queda disponible, pero ningún controlador de schedule/appointments lo compara contra :doctorId o doctor_id
```

`saveSchedule` y `getAppointments` reciben `req.user` en `req` pero jamás lo leen para restringir el alcance:

```js
// backend/src/controllers/schedule/scheduleController.js:39-54
scheduleController.saveSchedule = async (req, res) => {
    const { doctorId } = req.params;   // viene de la URL, no de req.user
    const data = req.body;
    const schedule = await scheduleModel.findOneAndUpdate(
        { doctor_id: doctorId }, { ...data, doctor_id: doctorId }, { new: true, upsert: true, runValidators: true }
    );
    // ...
};
```

**6. Código y componentes duplicados.** El segundo `getAvailableSlots`, muerto, con horarios fijos:

```js
// backend/src/controllers/appointments/appointmentsController.js:253-268
const allSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
];
```

Y en el frontend, el algoritmo de distribución de citas solapadas en columnas de `AppointmentsCalendar.jsx` (el más elaborado de la UI):

```js
// frontend/.../schedule/appointments/components/AppointmentsCalendar.jsx:95-131
const computeColumns = (appts) => {
    if (!appts.length) return [];
    const sorted = [...appts].sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
    const layout = sorted.map(appt => ({ appt, col: -1, totalCols: 1 }));
    const colEnds = [];

    layout.forEach(item => {
        const start = timeToMins(item.appt.start_time);
        let placed = false;
        for (let c = 0; c < colEnds.length; c++) {
            if (colEnds[c] <= start) {
                item.col = c;
                colEnds[c] = timeToMins(item.appt.end_time);
                placed = true;
                break;
            }
        }
        if (!placed) {
            item.col = colEnds.length;
            colEnds.push(timeToMins(item.appt.end_time));
        }
    });

    layout.forEach(item => {
        const start = timeToMins(item.appt.start_time);
        const end   = timeToMins(item.appt.end_time);
        let maxCol  = item.col;
        layout.forEach(other => {
            if (other === item) return;
            if (start < timeToMins(other.appt.end_time) && end > timeToMins(other.appt.start_time))
                maxCol = Math.max(maxCol, other.col);
        });
        item.totalCols = maxCol + 1;
    });

    return layout;
};
```

Y el umbral que decide si dos citas se dibujan como "punto" o como "tarjeta":

```js
// frontend/.../schedule/appointments/components/AppointmentsCalendar.jsx:759-762
const hasConflict = appts.some(other =>
    other._id !== appt._id &&
    Math.abs(startMins - timeToMins(other.start_time)) <= 10
);
```

### 1.3 Posibles preguntas

- ¿Por qué separaste `schedule` y `appointments` en vez de un solo modelo?
- Muéstrame en el código dónde se valida (o no) que el slot elegido siga libre al momento de guardar la cita. ¿Qué pasa si dos recepcionistas agendan al mismo doctor a la misma hora casi simultáneamente?
- Señala en `authMiddleware.js` y en `saveSchedule` por qué un doctor podría, técnicamente, sobrescribir el horario de otro doctor.
- ¿Por qué `start_time`/`end_time` son strings y no un solo campo `Date`? ¿Qué ventaja/desventaja tiene comparado con usar objetos `Date`?
- Traza a mano el algoritmo de slots con un bloque de 08:00-09:00, duración 30, buffer 20. ¿Cuántos slots genera y por qué no se desborda?
- Explica `computeColumns` línea por línea: ¿qué pasaría si tres citas se solapan entre sí en distintos pares (A-B se solapan, B-C se solapan, pero A-C no)?
- ¿Por qué existen dos formularios de cita casi iguales (`AppointmentsForm.jsx` y `AppointmentsFormCalendar.jsx`)? ¿Cómo lo refactorizarías?
- `expirePendingAppointments` corre en cada `GET`, no como cron job: ¿qué pasa si nadie abre el calendario un fin de semana?

---

## 2. Módulo Inventario (referencia del proyecto, según CLAUDE.md)

### 2.1 Cómo funciona — Backend, función por función

**Listado con filtro de estado calculado en Mongo** (no en JS, para poder paginar sobre el resultado ya filtrado):

```js
// backend/src/controllers/inventory/inventoryController.js:16-26
if (status && status !== "Todos") {
  if (status === "Disponible") {
    query.$expr = { $gt: ["$stock", "$min_stock"] };
  } else if (status === "Bajo") {
    query.$expr = {
      $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }],
    };
  } else if (status === "Crítico") {
    query.stock = { $lte: 0 };
  }
}
```

Ese `status` es un **virtual** del modelo — nunca se guarda en la base, se calcula al vuelo cada vez que se serializa un documento:

```js
// backend/src/models/inventory/inventory.js:25-33
InventorySchema.virtual("status").get(function () {
  if (this.stock <= 0) return "Crítico";
  if (this.stock <= this.min_stock) return "Bajo";
  return "Disponible";
});

InventorySchema.set("toJSON", { virtuals: true });
InventorySchema.set("toObject", { virtuals: true });
```

**Creación**: si el stock inicial es mayor a 0, además de crear el ítem, crea un movimiento de auditoría con usuario hardcodeado:

```js
// backend/src/controllers/inventory/inventoryController.js:82-92
if (Number(stock) > 0) {
  await new movementModel({
    type:     "Stock entry",
    item:     newItem._id,
    itemName: name,
    quantity: Number(stock),
    detail:   "Initial stock on product creation",
    user:     "Admin. Sistema",
  }).save();
}
```

**Las cuatro formas de mover stock — todas con el mismo patrón no-atómico** (`findById` → mutar en JS → `save()`), lo cual es la raíz de la condición de carrera:

```js
// backend/src/controllers/inventory/inventoryController.js:247-278 (adjustStock)
const item = await inventoryModel.findById(id);
if (!item) return res.status(404).json({ message: "Insumo no encontrado" });

const qty = Number(quantity);
if (adjustType === "aumentar") {
  item.stock += qty;
} else {
  item.stock = Math.max(0, item.stock - qty);
}
await item.save();
```

```js
// backend/src/controllers/inventory/inventoryController.js:318-346 (manualUsage)
for (const entry of items) {
  const item = await inventoryModel.findById(entry.insumoId);
  if (!item) continue;                       // <- fallo silencioso, sin rollback del resto del lote

  item.stock     = Math.max(0, item.stock - Number(entry.quantity));
  item.last_used = new Date();
  await item.save();

  await new movementModel({
    type: "Manual use", item: item._id, itemName: item.name,
    quantity: -Number(entry.quantity), detail: reason, user: responsible, patient: patient || null,
  }).save();
}
```

`discountFromProcedure` (backend/src/controllers/inventory/inventoryController.js:349-377) es prácticamente idéntica a `manualUsage`, solo cambia el `type` del movimiento a `"Treatment use"` y el texto del `detail` — otra duplicación de lógica candidata a unificarse en una sola función interna `applyStockDelta(itemId, delta, movementMeta)`.

**Borrado en cascada — se pierde la auditoría**:

```js
// backend/src/controllers/inventory/inventoryController.js:131-148
inventoryController.remove = async (req, res) => {
  const item = await inventoryModel.findById(req.params.id);
  if (item.image_public_id) await cloudinary.uploader.destroy(item.image_public_id);
  await inventoryModel.findByIdAndDelete(req.params.id);
  await movementModel.deleteMany({ item: req.params.id });   // <- borra también el historial
  return res.status(200).json({ message: "Insumo eliminado" });
};
```

**`update()` no genera movimiento** aunque cambie el `stock` directamente:

```js
// backend/src/controllers/inventory/inventoryController.js:101-128
const updateData = { ...req.body };
if (updateData.stock) updateData.stock = Number(updateData.stock);
// ... nunca se llama a movementModel aquí, a diferencia de adjustStock/stockEntry/manualUsage
const updatedItem = await inventoryModel.findByIdAndUpdate(id, updateData, { new: true });
```

**Debug leftover en producción**:

```js
// backend/src/controllers/inventory/inventoryController.js:178-187
const allWithDate = await inventoryModel
  .find({ expiration_date: { $ne: null, $exists: true } })
  .select("name expiration_date");
console.log("[stats] productos con fecha:", allWithDate.map(p => ({
  name: p.name,
  expiration_date: p.expiration_date,
  type: typeof p.expiration_date,
})));
console.log("[stats] today:", today, "| in60Days:", in60Days);
```

Este bloque, además de ser ruido de consola, trae **todos** los productos con fecha de vencimiento solo para loguearlos — una consulta extra innecesaria en el endpoint de estadísticas, que probablemente se llama cada vez que se abre el dashboard de inventario.

**Relación entre `inventory` y `movements`** — denormalización deliberada de `itemName`:

```js
// backend/src/models/inventory/movements.js:1-24
const movementSchema = new Schema({
    type: { type: String, enum: ["Treatment use", "Stock entry", "Inventory adjustment", "Manual use"], required: true },
    item: { type: Schema.Types.ObjectId, ref: "inventory", required: true },
    itemName:  { type: String },                 // denormalized for reports
    quantity:  { type: Number, required: true }, // negative = output, positive = input
    detail:    { type: String },
    user:      { type: String },
    patient:   { type: String },
    date:      { type: Date, default: Date.now },
}, { timestamps: true });
```

**Orden de rutas** (respeta la regla de CLAUDE.md, con una salvedad):

```js
// backend/src/routes/inventory/inventory.js
router.get("/stats",     inventoryController.getStats);
router.get("/movements", inventoryController.getMovements);
router.get("/charts",    inventoryController.getCharts);

router.route("/").get(inventoryController.getAll).post(upload.single("imagen"), inventoryController.create);
router.route("/:id").get(inventoryController.getById).put(...).delete(...);

// Estas van DESPUÉS de /:id, pero no chocan porque /:id solo registra GET/PUT/DELETE, no POST:
router.post("/:id/adjust",         inventoryController.adjustStock);
router.post("/stock-entry",        upload.single("documento"), inventoryController.stockEntry);
router.post("/manual-usage",       inventoryController.manualUsage);
router.post("/procedure-discount", inventoryController.discountFromProcedure);
```

### 2.2 Cómo funciona — Frontend

`InventoryDashboard.jsx` centraliza el estado y usa un contador `refresh` como "señal de invalidación" — cada vez que una acción tiene éxito, se incrementa y los componentes hijos (`InventoryTable`, `InventoryCharts`, `RecentMovements`) lo reciben como prop `refreshTrigger` y vuelven a pedir sus datos. Es el mismo patrón que en `AppointmentsCalendar.jsx` (`triggerRefresh`/`setRefresh(r => r+1)`).

Hay dos hooks paralelos de inventario que **no son duplicados exactos** sino que cubren necesidades distintas: `useInsumos.js` es el hook completo de CRUD+acciones (usa `fetch` con URL hardcodeada), mientras `useInventory.js` es de solo lectura y lo usa `ProcedureRow.jsx` (en el módulo de consultas) para poblar un selector de materiales — usa el cliente `apiClient` compartido en vez de `fetch` plano. Es lógica duplicada (ambos piden `GET /api/inventory`) con dos convenciones de HTTP client distintas conviviendo en el mismo proyecto.

### 2.3 Posibles preguntas

- Muestra en el código por qué `adjustStock` puede perder una actualización si dos personas ajustan el mismo producto casi al mismo tiempo. ¿Cómo lo arreglarías con `findOneAndUpdate` y `$inc`?
- Si borras un producto, ¿qué le pasa a su historial en `movements`? Muéstralo en el código de `remove()`. ¿Es correcto para un sistema de auditoría clínica?
- ¿Por qué `status` es un `virtual` de Mongoose y no un campo persistido? ¿Qué te obliga a hacer eso al filtrar (`$expr` en vez de un simple `find({status: ...})`)?
- `manualUsage` hace `continue` si un id no existe (línea 325): ¿qué pasa con los movimientos ya guardados de ese mismo lote si el ítem 3 de 5 falla? ¿Hay rollback?
- ¿Por qué `create()` sí genera un movimiento inicial pero `update()` no genera ninguno aunque cambie el stock? ¿Es un hueco o una decisión consciente?
- ¿Qué hace exactamente el bloque de `console.log` en `getStats`? ¿Qué costo tiene dejarlo en producción?

---

## 3. Módulo Dashboard

### 3.1 Cómo funciona

`Home.jsx` decide qué dashboard mostrar según el rol real del usuario autenticado — **no hardcodea nada**, a diferencia de lo que decía una versión anterior de CLAUDE.md:

```jsx
// frontend/.../modules/home/pages/Home.jsx
const Home = () => {
    const { userType } = useAuth();
    if (userType === "admin")        return <AdminDashboard />;
    if (userType === "doctor")       return <DoctorDashboard />;
    if (userType === "receptionist") return <RecepcionistDashboard />;
    if (userType === "nurse")        return <NurseDashboard />;
    return <div className="p-8 text-slate-400 text-sm">Cargando Dashboard...</div>;
};
```

`SideBar.jsx` también lee el rol real desde el mismo contexto de autenticación y filtra el menú dinámicamente:

```jsx
// frontend/.../components/layouts/SideBar.jsx:24-55
const { userType, isLoading } = useAuth();
// ...
const currentUserRole = userType;

const filteredMenu = sideBarMenu.filter(item =>
    item.allowedRoles.includes(currentUserRole)
).map(item => {
    if (item.subItems) {
        return { ...item, subItems: item.subItems.filter(sub => sub.allowedRoles.includes(currentUserRole)) };
    }
    return item;
});
```

Los dashboards de **Admin** y **Doctor** están conectados a agregaciones Mongo reales. Ejemplo representativo de `dashboardController.getStats` (crecimiento de ingresos mes a mes con `Promise.all` para paralelizar las consultas):

```js
// backend/src/controllers/dashboard/dashboardController.js:23-53 (resumido)
const [
    revenueAgg, lastMonthRevenueAgg, thisMonthRevenueAgg,
    activeDoctors, appointmentsToday, appointmentsYesterday,
    totalPatients, lastMonthPatients,
] = await Promise.all([
    appointmentsModel.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
    appointmentsModel.aggregate([{ $match: { date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } } },
                                  { $group: { _id: null, total: { $sum: "$total" } } }]),
    // ...
]);

const revenueGrowth = lastMonthRevenue > 0
    ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
    : 0;
```

### 3.2 Parte difícil / hallazgo crítico

**`NurseDashboard.jsx` y `RecepcionistDashboard.jsx` están completamente vacíos:**

```jsx
// frontend/.../modules/home/pages/NurseDashboard.jsx (archivo completo)
//Dashboard de la enfermera

const NurseDashboard = () =>{

}
export default NurseDashboard
```

```jsx
// frontend/.../modules/home/pages/RecepcionistDashboard.jsx (archivo completo)
//Dashboard del recepcionista

const RecepcionistDashboard = () =>{

}
export default RecepcionistDashboard
```

Un componente de función que no ejecuta ningún `return` produce `undefined`, y React lanza un error en tiempo de ejecución ("Nothing was returned from render"). Como `Home.jsx` los renderiza directamente cuando `userType` es `"nurse"` o `"receptionist"`, **cualquier enfermera o recepcionista que inicie sesión hace crashear la pantalla principal**. No existe tampoco ningún controlador backend equivalente a `dashboardController.js`/`doctorDashboardController.js` para estos dos roles.

### 3.3 Posibles preguntas

- Abre `NurseDashboard.jsx` en vivo durante la defensa y muestra qué pasa si inicias sesión como enfermera. ¿Cómo lo solucionarías con el tiempo que te queda?
- ¿Por qué los dashboards de Admin/Doctor están completos pero los de Enfermera/Recepcionista no?
- Explica la agregación de `revenueGrowth` en `dashboardController.js`: ¿qué pasa si `lastMonthRevenue` es 0 (clínica nueva, sin historial)? Mira el código — ¿está cubierto ese caso?
- Si tuvieras que implementar el dashboard de enfermera hoy, ¿qué datos mostrarías y de qué colecciones ya existentes (`appointments`, `consultations`, `nurse_notes`) los sacarías?

---

## 4. Módulo Procedimientos — corrección importante a CLAUDE.md

CLAUDE.md afirma que `procedureController.js` está **"intencionalmente vacío, pendiente de asignación"**. Esto está desactualizado — el controlador ya tiene las 4 operaciones CRUD completas y funcionando:

```js
// backend/src/controllers/procedures/procedureController.js:20-59 (insertProcedure)
proceduresController.insertProcedure = async (req, res) => {
    const { name, description, estimated_duration, price, materials,
            post_operative_instructions, requires_nurse, is_active } = req.body

    // Limpia el _id que Mongoose agrega a subdocumentos si vienen de un
    // procedimiento ya existente — evita CastError al reinsertar
    const cleanMaterials = (materials || []).map(({ _id, ...rest }) => ({
        name:     rest.name     || "",
        quantity: rest.quantity || 1,
        ...(rest.insumo ? { insumo: rest.insumo } : {})
    }))

    const payload = new proceduresModel({ name, description, estimated_duration, price,
        materials: cleanMaterials, post_operative_instructions, requires_nurse, is_active })

    const savedProcedure = await payload.save()
    return res.status(200).json({ message: "Data save", Data: savedProcedure })
}
```

El modelo ya conecta procedimientos con insumos de inventario:

```js
// backend/src/models/procedures/procedures.js:19-25
materials: [
    {
        insumo: { type: Schema.Types.ObjectId, ref: "inventory" },
        name: { type: String },
        quantity: { type: Number, default: 1 },
    },
],
```

Y `getProcedures` ya hace `populate` de esos materiales:

```js
// backend/src/controllers/procedures/procedureController.js:6-18
proceduresController.getProcedures = async (req, res) => {
    const response = await proceduresModel.find()
        .populate("materials.insumo", "name")
    // ...
}
```

Las rutas están montadas y protegidas por rol en `app.js`:

```js
// backend/app.js:70
app.use("/api/procedures", validateAuthCookie(["admin", "doctor"]), proceduresRoutes);
```

**Recomendación**: actualiza esa línea de CLAUDE.md para que no induzca a alguien del equipo a "reimplementar" algo que ya existe y ya está integrado con inventario. Puedo hacerlo si me lo pides.

### 4.1 Posibles preguntas

- Muestra que `procedureController.js` no está vacío. ¿Por qué crees que CLAUDE.md quedó desactualizado en ese punto?
- ¿Cómo se conecta un procedimiento con el inventario? Señala el campo `materials.insumo` y explica qué pasaría si se usa `discountFromProcedure` del controlador de inventario junto con esto.
- ¿Por qué `insertProcedure`/`updateProcedure` eliminan el `_id` de los subdocumentos de `materials` antes de guardar? ¿Qué error concreto de Mongoose evita eso?

---

## 5. Módulo Tratamientos — estado actual y cómo funcionaría el backend a futuro

### 5.1 Estado actual: 100% maqueta (mock), con evidencia directa en el código

El hook completo, sin ninguna llamada de red:

```js
// frontend/.../modules/treatments/hooks/useTreatmentsFollowUp.js (archivo completo)
import { useState, useEffect } from "react";
import {
  treatmentsStats, treatmentsPatients, evolutionChartData, upcomingControlsList,
} from "../data/treatmentsData";

const useTreatmentsFollowUp = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [upcomingControls, setUpcomingControls] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats(treatmentsStats);
      setPatients(treatmentsPatients);
      setChartData(evolutionChartData);
      setUpcomingControls(upcomingControlsList);
      setLoading(false);
    }, 500);   // <-- simula latencia de red, pero no hay red
    return () => clearTimeout(timer);
  }, []);

  return { loading, stats, patients, chartData, upcomingControls };
};
```

Un fragmento real del mock, para mostrar la forma exacta de los datos (`treatmentsData.js`):

```js
// frontend/.../modules/treatments/data/treatmentsData.js (fragmento, un paciente de 6 hardcodeados)
{
    id: "10234",
    name: "Juan Pérez López",
    age: 35,
    gender: "Masculino",
    diagnosis: "Uñero infectado",
    diagnosisDetail: "Pie izquierdo",
    currentTreatment: "Antibiótico + Curaciones",
    doctor: "Dr. Juan Pérez",
    startDate: "24/06/2024",
    nextControl: "29/06/2024",
    nextControlIn: "En 2 días",
    status: "En tratamiento",   // "En tratamiento" | "Requiere revisión" | "Suspendido" | "Finalizado"
    clinicalInfo: { diagnostico, medicoResponsable, fechaInicio, fechaEstimadaAlta },
    treatmentItems: [{ name: "Amoxicilina 500 mg", detail: "Cada 8 horas por 7 días" }, /* ... */],
    followUpSteps: [
        { label: "Día 1 - 24/06/2024", detail: "Consulta inicial y procedimiento", status: "Completado" },
        { label: "Día 15 - 08/07/2024", detail: "Próximo control", status: "Pendiente" },
    ],
    lastObservation: { text: "El paciente presenta buena evolución...", date: "01/07/2024", author: "Dr. Juan Pérez" },
}
```

Confirmé además, con una búsqueda de texto (`grep -i "treatment|tratamiento"`) sobre todo `backend/src`, que **no existe ningún controlador, modelo ni ruta** dedicados a tratamientos — ni una sola coincidencia relevante fuera de menciones incidentales dentro del texto de categorías de inventario.

### 5.2 Propuesta de backend futuro

**Modelo `Treatments`** (nueva colección, siguiendo el mismo patrón de `schedule`/`appointments`/`procedures` ya usado en el proyecto):

```js
// Propuesta: backend/src/models/treatments/treatments.js
const treatmentSchema = new Schema({
  patient_id: { type: Schema.Types.ObjectId, ref: "Patients", required: true },
  doctor_id:  { type: Schema.Types.ObjectId, ref: "Doctors",  required: true },
  diagnosis:        { type: String, required: true },
  diagnosis_detail: { type: String },
  status: { type: String, enum: ["active", "needs_review", "suspended", "finished"], default: "active" },
  start_date:         { type: Date, required: true },
  estimated_end_date: { type: Date },

  // Reutiliza procedimientos ya existentes en vez de duplicar nombre/precio/duración
  treatment_items: [{
    procedure_id: { type: Schema.Types.ObjectId, ref: "procedure" },
    name: String, detail: String,
  }],

  follow_up_steps: [{ label: String, detail: String,
    status: { type: String, enum: ["pending", "completed"] }, date: Date }],

  observations: [{ text: String, date: { type: Date, default: Date.now },
    author_id: { type: Schema.Types.ObjectId, ref: "Doctors" } }],

  // El "próximo control" ES una cita real del calendario ya construido, no una fecha suelta
  next_control_appointment_id: { type: Schema.Types.ObjectId, ref: "Appointments" },
}, { timestamps: true, strict: false });
```

**Por qué referenciar `Appointments` y `procedures` en vez de duplicar campos**: el mock actual guarda `nextControl: "29/06/2024"` como un string suelto, desconectado de cualquier cita real. Si el "próximo control" en cambio apunta al `_id` de una cita de tipo `Control/Seguimiento` ya creada en `appointments`, el calendario y el módulo de tratamientos nunca pueden desincronizarse — cancelar o reagendar la cita actualiza automáticamente lo que ve el módulo de tratamientos, sin duplicar lógica de fechas/timezone (que ya es delicada, ver §1.2).

**Endpoints propuestos**, siguiendo exactamente el patrón ya usado en `scheduleController.js`/`appointmentsController.js`:

| Método | Ruta | Función | Reemplaza en el mock |
|---|---|---|---|
| GET | `/api/treatments` | Listado paginado + filtros (status, doctor_id, patient_id, search) | `treatmentsPatients` |
| GET | `/api/treatments/stats` | Contadores (activos, requieren revisión, etc.) — **declarar antes de `/:id`** | `treatmentsStats` |
| GET | `/api/treatments/evolution-chart` | Agregación semanal de `follow_up_steps.status` | `evolutionChartData` |
| GET | `/api/treatments/upcoming-controls` | Tratamientos con `next_control_appointment_id` dentro de N días | `upcomingControlsList` |
| GET | `/api/treatments/:id` | Detalle con `populate` de paciente/doctor/cita | — |
| POST | `/api/treatments` | Crear tratamiento | — |
| PUT | `/api/treatments/:id` | Editar / agregar `follow_up_steps`/`observations` | — |
| PATCH | `/api/treatments/:id/status` | Cambiar solo el estado | — |

Ejemplo de cómo se vería la agregación de `evolution-chart`, calcada del estilo ya usado en `inventoryController.getCharts` (`$group` + `$dateToString`):

```js
// Propuesta, mismo estilo que inventoryController.getCharts (backend/src/controllers/inventory/inventoryController.js:385-395)
const weekly = await treatmentModel.aggregate([
  { $unwind: "$follow_up_steps" },
  { $match: { "follow_up_steps.date": { $gte: sixWeeksAgo } } },
  { $group: {
      _id: { $dateToString: { format: "%d %b", date: "$follow_up_steps.date" } },
      mejorando:  { $sum: { $cond: [{ $eq: ["$follow_up_steps.status", "improving"] }, 1, 0] } },
      sinCambios: { $sum: { $cond: [{ $eq: ["$follow_up_steps.status", "no_change"] }, 1, 0] } },
      empeorando: { $sum: { $cond: [{ $eq: ["$follow_up_steps.status", "worsening"] }, 1, 0] } },
  }},
  { $sort: { _id: 1 } },
]);
```

### 5.3 Posibles preguntas

- Muestra en `useTreatmentsFollowUp.js` la línea exacta que demuestra que no hay llamada de red. ¿Qué tendrías que cambiar (mínimamente) para que apunte a un backend real sin tocar los componentes de presentación?
- ¿Por qué un tratamiento debería referenciar una cita existente para su "próximo control" en vez de guardar un string de fecha suelto como hace el mock hoy (`nextControl: "29/06/2024"`)?
- ¿Cómo evitarías que la agregación de `EvolutionChart` se vuelva cara si hay miles de tratamientos con cientos de `follow_up_steps` cada uno?
- Si un tratamiento usa insumos de inventario (ej. medicamentos), ¿cómo conectarías la creación de un tratamiento con `discountFromProcedure` que ya existe en `inventoryController.js`?

---

## 6. Módulo Reportes — estado actual y cómo funcionaría el backend a futuro

### 6.1 Estado actual: 100% maqueta, las 4 secciones comparten un solo archivo y el mismo patrón

Los cuatro hooks de reportes son **estructuralmente idénticos** — este es el de inventario completo, pero los de citas/doctores/pacientes son copia exacta del mismo patrón cambiando solo el nombre de las variables importadas:

```js
// frontend/.../modules/reports/inventory/hooks/useInventoryReports.js (archivo completo)
import { useState, useEffect } from "react";
import { inventarioTopCards, inventarioSections } from "../../reportsData";

const useInventarioReport = () => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTopCards(inventarioTopCards);
      setSections(inventarioSections);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { loading, topCards, sections };
};
```

Y el archivo compartido de donde salen los números, con datos y porcentajes fijos escritos a mano:

```js
// frontend/.../modules/reports/reportsData.js (fragmento)
export const citasTopCards = [
  {
    key: "programadas",
    title: "Citas programadas",
    toggles: ["Por mes", "Por día"],
    stat: "350",
    statLabel: "este mes",
    statDiff: "+8% comparado con el período anterior",
    chartData: {
      "Por mes": [
        { label: "Ene", total: 280 }, { label: "Feb", total: 310 }, /* ... */
      ],
      "Por día": [ { label: "Lun", total: 42 }, /* ... */ ],
    },
  },
  // ...
];
```

Ninguno de los cuatro hooks (`useInventarioReport`, `useCitasReport`, `useDoctoresReport`, `usePacientesReport`) llama `fetch`/`apiClient`/`axios` — el `setTimeout` es puramente cosmético para que el skeleton de carga se vea creíble.

### 6.2 Propuesta de backend futuro

La buena noticia es que **el patrón de agregación ya existe y está probado** en `dashboardController.js` — los reportes no necesitan una técnica nueva, solo aplicar el mismo enfoque (`Promise.all` de agregaciones Mongo + comparación contra el período anterior) sobre rangos de fecha configurables en vez de fijos a "hoy":

| Reporte | Colección(es) fuente | Agregación clave | Ya existe algo parecido en... |
|---|---|---|---|
| Citas | `appointments` | Conteo por estado/tipo en un rango, variación % vs periodo anterior | `dashboardController.getStats` (revenueGrowth) |
| Pacientes | `patients`, `appointments` | Nuevos pacientes por mes, recurrentes, distribución por género/edad | `dashboardController.getStats` (patientGrowth) |
| Doctores | `doctors`, `appointments`, `consultations` | Citas atendidas por doctor, tasa de cancelación/no-show, ingresos | `doctorDashboardController.js` (analytics) |
| Inventario | `inventory`, `movements` | Reutiliza casi 1:1 `inventoryController.getStats`/`getCharts`, con rango de fechas parametrizable | `inventoryController.getCharts` |

**Diseño sugerido**: un solo controlador `reportsController.js` con una función por dominio, todas aceptando `?from=&to=` como query params, y todas devolviendo la misma forma `{ topCards: [...], sections: [...] }` que ya usa `reportsData.js` — así los componentes de presentación (`ReportsSection.jsx`, `TopCard.jsx`) **no necesitan cambiar nada**, solo hay que reemplazar la fuente de datos del hook:

```js
// Propuesta: mismo hook, reemplazando el mock por una llamada real
const useInventarioReport = (from, to) => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    setLoading(true);
    apiClient(`/reports/inventory?from=${from}&to=${to}`)
      .then(({ topCards, sections }) => { setTopCards(topCards); setSections(sections); })
      .finally(() => setLoading(false));
  }, [from, to]);

  return { loading, topCards, sections };
};
```

### 6.3 Posibles preguntas

- Enséñame la línea exacta en `useInventarioReport.js` (o cualquiera de los otros tres) que demuestra que no hay llamada de red.
- ¿Por qué las 4 páginas de reportes comparten la misma forma de datos (`topCards`/`sections`)? ¿Qué te permite eso al migrar de mock a real sin tocar los componentes visuales?
- El reporte de inventario ya tiene casi toda su lógica de agregación escrita en `inventoryController.getStats`/`getCharts` — ¿por qué no la reutilizaste ahí mismo en vez de hardcodear `reportsData.js`?
- ¿Cómo evitarías recalcular agregaciones pesadas (ej. reporte anual de citas) en cada carga de página?

---

## 7. Resumen de inconsistencias en CLAUDE.md a corregir

1. `procedureController.js` está descrito como vacío/pendiente — ya está completo y en producción (ver §4).
2. Se afirma que `Home.jsx` y `SideBar.jsx` "hardcodean el rol como admin" — ya no es cierto en ninguno de los dos; ambos leen `userType` real desde `useAuth()` (ver §3.1).

Puedo actualizar CLAUDE.md directamente si quieres que quede reflejado para el resto del equipo.
