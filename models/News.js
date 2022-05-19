const {Schema, model, ObjectId} = require("mongoose")

const News = new Schema({
    title: {type: String, required: true, unique: true},
    date: {type: Date, default: Date.now()},
    content: {type: String, required: true},
    image: {type: String, required: false}
})

module.exports = model('News', News)
