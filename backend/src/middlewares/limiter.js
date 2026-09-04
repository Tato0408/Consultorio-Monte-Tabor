import rateLimit from 'express-rate-limit'

// 200 peticiones/5min por IP se quedaba corto para uso real de clínica: todo
// el personal de una sucursal suele salir por la misma IP de oficina (NAT), y
// pantallas como el expediente o los dashboards disparan varias peticiones en
// paralelo por carga de página. Con varias estaciones activas a la vez en
// horas pico, el límite se alcanzaba con tráfico legítimo, no con abuso.
const limiter = rateLimit ({
    windowMs: 5*60*1000, //tiempo (5)
    max:1000, //1000 peticiones maximo por 5 min
    message: {
        status: 429,
        error: "Too Many request"
    }
})

export default limiter