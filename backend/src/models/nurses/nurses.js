import mongoose, {Schema, model} from 'mongoose'

const nurseSchema = new Schema({
    img_url: {type: String},
    public_id: {type:String},
    name: {type:String},
    last_name: {type:String},
    dui: {type:String},
    phone: {type:String},
    birth_date: {type:Date},
    email: {type:String},
    password: {type: String},
    is_active: {type:Boolean},
    is_verified: {type:Boolean},
    loginAttemps: {type: Number},
    time_out: {type: Number}
}, {
    timestamps: true,
    strict: false
})

export default model('nurses', nurseSchema)