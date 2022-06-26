const mongoose = require('mongoose');

const computerSchema = mongoose.Schema({
    ip: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true
    },
    bluetooth: {
        type: Boolean,
        required: true
    },
    volumeLevel: {
        type: Number,
        required: true
    },
    closeApps: {
        type: Boolean,
        required: true
    },
    appsToStart: {
        type: Array,
        required: true
    },
    desktopBackground: {
        type: String
    },
    desktopBackgroundBase64: {
        type: String
    }
}, );

module.exports = mongoose.model('Computer', computerSchema);