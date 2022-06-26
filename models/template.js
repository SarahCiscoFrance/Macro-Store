const mongoose = require('mongoose');

const templateSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    path: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      default: Date.now
    },
    involvedWebexDevices: {
      type: Array,
      required: true,
    },
    involvedComputers: {
      type: Array,
      required: false,
    }
  },
);

module.exports = mongoose.model('Template', templateSchema);
