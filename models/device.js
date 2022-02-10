const mongoose = require('mongoose');

const dataSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    mac: {
      type: String,
      required: true,
      unique: true
    },
    ip: {
      type: String,
      required: true,
    },
    webexId: {
      type: String,
      required: true,
      unique: true
    },
    backupFileName: {
      type: String,
      required: false,
    },
    fileChecksum: {
      type: String,
      required: false,
    },
    hasBackupFile: {
      type: Boolean,
      required: true,
    }
  },
);

module.exports = mongoose.model('Device', dataSchema);
