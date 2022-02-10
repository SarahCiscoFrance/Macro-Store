const mongoose = require('mongoose');

const macroSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    repo_url: {
        type: String,
        required: true,
        unique: true
    },
    repo_api_url: {
        type: String,
        required: true,
        unique: true
    },
    repo_name: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    need_adjustment: {
        type: Boolean,
        default: false
    }

}, );

module.exports = mongoose.model('Macro', macroSchema);