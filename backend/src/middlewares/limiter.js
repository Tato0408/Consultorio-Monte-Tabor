import rateLimit from 'express-rate-limit'

const limiter = rateLimit ({
    windowMs: 5*60*1000, //tiempo (5)
    max:200, //200 peticiones maximo por 5 min
    message: {
        status: 429,
        error: "Too Many request"
    }
})

export default limiter