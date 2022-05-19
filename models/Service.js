const {Schema, model, ObjectId} = require("mongoose")

const Service = new Schema({
    name: {type: String, required: true, unique: true},
    phone: {type: String, required: false},
    email: {type: String, required: false},
    price: {type: String, required: false},
    image: {type: String, required: false}
})

module.exports = model('Service', Service)
