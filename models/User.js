const {Schema, model, ObjectId} = require("mongoose")


const User = new Schema({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    username: {type: String, required: true},
    fullname: {type: String, required: false},
    phone: {type: String, required: false},
    region: {type: String, required: false},
    city: {type: String, required: false},
    street: {type: String, required: false},
    factura: {type: String, required: false},
    service: {type: String, required: false},
    status: {type: String, required: false, default: 'Статус белгіленбеген!'},
    avatar: {type: String},
    files : [{type: ObjectId, ref:'File'}]
})

module.exports = model('User', User)
