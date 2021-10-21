const fs = require("fs");
var crypto = require('crypto');
const xAPIUtils = require("../xAPICloud/utils");
const mongoose = require("mongoose");
const Device = require('../models/device');

mongoose.connect("mongodb://localhost:27017/macro-store", {
  useNewUrlParser: true
});

exports.getIndex = async (req, res, next) => {
  res.render("index", {
    title: "Macro Store",
    devices: await xAPIUtils.getDevices(),
    backupedDevices: await getBackupedDevices(),
    marcosAvailable: await getFilesName("./public/uploads/macros/"),
    panelAvailable: await getFilesName("./public/uploads/panels/"),
    backupsAvailable: await getFilesName("./public/uploads/backups/"),
  });
};

exports.uploadFile = async (req, res, next) => {
  let fileIsValid = false;
  let sampleFile;
  let uploadPath;
  let fileNames;
  const fileType = req.body.basicRadio;
  console.log(req.body.basicRadio);
  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send("No files were uploaded.");
    return;
  }

  console.log("req.files >>>", req.files); // eslint-disable-line

  sampleFile = req.files.sampleFile;

  if (fileType === "macro" && sampleFile.name.includes(".js")) {
    fileIsValid = true;
    fileNames = await getFilesName("./public/uploads/macros/");
    if (fileNames.includes(sampleFile.name)) {
      let new_name = sampleFile.name;
      new_name = new_name.replace(".js", "");
      new_name = new_name + "_" + new Date().toJSON().slice(0, 10) + ".js";
      uploadPath = "./public/uploads/macros/" + new_name;
    } else {
      uploadPath = "./public/uploads/macros/" + sampleFile.name;
    }
  } else if (fileType === "panel" && sampleFile.name.includes(".xml")) {
    fileIsValid = true;
    fileNames = await getFilesName("./public/uploads/panels");
    if (fileNames.includes(sampleFile.name)) {
      let new_name = sampleFile.name;
      new_name = new_name.replace(".js", "");
      new_name = new_name + "_" + new Date().toJSON().slice(0, 10) + ".js";
      uploadPath = "./public/uploads/panels/" + new_name;
    } else {
      uploadPath = "./public/uploads/panels/" + sampleFile.name;
    }
  } else if (fileType === "backup" && sampleFile.name.includes(".zip")) {
    fileIsValid = true;
    fileNames = await getFilesName("./public/uploads/backups");
    if (fileNames.includes(sampleFile.name)) {
      let new_name = sampleFile.name;
      new_name = new_name.replace(".zip", "");
      new_name = new_name + "_" + new Date().toJSON().slice(0, 10) + ".zip";
      uploadPath = "./public/uploads/backups/" + new_name;
    } else {
      uploadPath = "./public/uploads/backups/" + sampleFile.name;
    }
  } else {
    res.json({
      code: "400",
      msg: "Check format : macro (.js) or panel (.xml) or backup (.zip)."
    });
  }

  if (fileIsValid) {
    sampleFile.mv(uploadPath, function (err) {
      if (err) {
        return res.status(500).send(err);
      }
      res.redirect("/");
    });
  }
};

exports.saveFile = async (req, res, next) => {
  const devices = [].concat(req.body.deviceSelected);
  const macros = [].concat(req.body.macroSelected);
  const panels = [].concat(req.body.panelSelected);

  console.log(devices, macros, panels);
  try {
    devices.forEach(device => {
      if (macros.length > 0 && !macros.includes(undefined)) {
        macros.forEach(macro => {
          macro = JSON.parse(macro);
          const macroText = fs.readFileSync(
            "./public/uploads/macros/" + macro.macroName, {
              encoding: "utf-8"
            }
          );

          xAPIUtils
            .saveMacro(
              device,
              macro.macroName.replace(".js", ""),
              "True",
              "False",
              macroText
            )
            .then(() => {
              if (macro.activationOnInstall === "True") {
                xAPIUtils.setMacroActivation(
                  device,
                  macro.macroName.replace(".js", ""),
                  true
                );
              }
            });
        });
      }
      if (panels.length > 0 && !panels.includes(undefined)) {
        panels.forEach(panel => {
          const panelContent = fs.readFileSync("./public/uploads/panels/" + panel, {
            encoding: "utf-8"
          });

          xAPIUtils.savePanel(
            device,
            panel.replace(".xml", "") + Date.now(),
            panelContent
          );
        });
      }
    });
    res.json({
      code: "204"
    });
  } catch (error) {
    console.error(error);
    res.json({
      code: "500",
      msg: error.message
    });
  }

  //res.status(204).send();
};

exports.deleteFile = (req, res, next) => {
  const filePath = req.body.file;
  try {
    fs.unlinkSync(filePath);
    //file removed
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.deleteMacroOnDevice = (req, res, next) => {
  const macroName = req.body.macroName;
  const deviceId = req.body.deviceId;
  try {
    xAPIUtils.removeMacro(deviceId, macroName);
    res.json({
      code: "204"
    });
  } catch (error) {
    console.error(error);
    res.json({
      code: "500",
      msg: error.message
    });
  }

};

exports.removeAllFile = (req, res, next) => {
  const devices = [].concat(req.body.deviceSelected);
  const isallMacroBtnChecked = req.body.allMacro;
  const isallPanelBtnChecked = req.body.allPanel;
  console.log(devices, isallMacroBtnChecked, isallPanelBtnChecked);
  try {
    if (isallMacroBtnChecked == "on") {
      devices.forEach(deviceId => {
        xAPIUtils.removeAllMacro(deviceId);
      });
    }
    if (isallPanelBtnChecked == "on") {
      devices.forEach(deviceId => {
        xAPIUtils.removeAllPanel(deviceId);
      });
    }
    res.json({
      code: "204"
    });
  } catch (error) {
    console.error(error);
    res.json({
      code: "500",
      msg: error.message
    });
  }
};

exports.changeMacroActivationStatus = (req, res, next) => {
  const deviceId = req.body.deviceId;
  const macroName = req.body.macroName;
  const isMacroActive = req.body.isMacroActive === 'true';
  console.log(deviceId, macroName, isMacroActive);
  try {
    xAPIUtils.setMacroActivation(deviceId, macroName, isMacroActive);
    res.json({
      code: "204"
    });
  } catch (error) {
    console.error(error);
    res.json({
      code: "500",
      msg: error.message
    });
  }
};

exports.getDevice = async (req, res, next) => {
  const deviceId = req.params.deviceId;
  res.render("device", {
    title: "Device",
    deviceDetails: await xAPIUtils.getDeviceDetail(deviceId),
    deviceLocalDetails: await getDeviceLocalInfo(deviceId),
    macros: await xAPIUtils.getAllMacroFromDevice(deviceId),
    marcosAvailable: await getFilesName("./public/uploads/macros/"),
    panelAvailable: await getFilesName("./public/uploads/panels/"),
    backupsAvailable: await getFilesName("./public/uploads/backups/"),
  });
};

exports.linkBackupToDevice = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  const deviceName = req.body.deviceName;
  const deviceMac = req.body.deviceMac;
  const deviceIp = req.body.deviceIp;
  const backupFileName = req.body.backupFileName;

  // var device = new Device({
  //   name: deviceName,
  //   mac: deviceMac,
  //   ip: deviceIp,
  //   webexId: deviceId,
  //   backupFileName: backupFileName,
  //   hasBackupFile: true
  // });
  try {
    fs.readFile('./public/uploads/backups/' + backupFileName, function (err, data) {
      var checksum = generateChecksum(data, "sha512");
      Device.updateOne({
        mac: deviceMac
      }, {
        name: deviceName,
        mac: deviceMac,
        ip: deviceIp,
        webexId: deviceId,
        backupFileName: backupFileName,
        hasBackupFile: true,
        fileChecksum: checksum
      }, {
        upsert: true
      }, function (err, save) {
        if (err) {
          console.error(err)
          res.json({
            code: "500",
            msg: err.message
          });
        } else {
          console.log("Backup linked to device!");
          res.json({
            code: "204"
          });
        }
      });
    });
  } catch (error) {
    console.error(error)
    res.json({
      code: "500",
      msg: error.message
    });
  }


  // //Save the created device in db
  // device.save(function (err, save) {
  //   if (err) {
  //     console.error(err)
  //     res.json({
  //       code: "500",
  //       msg: error.message
  //     });
  //   } else {
  //     console.log("device added in data base!");
  //     res.json({
  //       code: "204"
  //     });
  //   }
  // });

};


exports.unlinkBackupFromDevice = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  const deviceName = req.body.deviceName;
  const deviceMac = req.body.deviceMac;
  const deviceIp = req.body.deviceIp;
  const backupFileName = req.body.backupFileName;

  Device.findOneAndUpdate({
    mac: deviceMac
  }, {
    $set: {
      hasBackupFile: false,
      backupFileName: null
    }
  }, {
    new: true
  }, (error, doc) => {
    if (error) {
      console.log("Something wrong when updating data!");
      res.json({
        code: "500",
        msg: error.message
      });
    }
    console.log(doc);
    res.json({
      code: "204"
    });
  });

};


exports.restoreShowroomToDefault = (req, res, next) => {

  getBackupedDevices().then(devices => {
    var promises = [];
    devices.forEach(device => {
      promises.push(xAPIUtils.restoreBackup(device.webexId, device.fileChecksum, device.backupFileName))
    });
    
    Promise.all(promises).then((values) => {
      console.log(values);
      res.json({
        code: "204"
      });
    });
  });

  // fs.readFile('./public/uploads/backups/backup.zip', function(err, data) {
  //   var checksum = generateChecksum(data, "sha512");
  //   console.log(checksum);
  //   console.log("ok");
  //   res.json({
  //     code: "204"
  //   });
  // });
};

/**
 * FUNCTION
 */

function getFilesName(pathFolder) {
  return new Promise(resolve => {
    var filesName = [];
    fs.readdir(pathFolder, (err, files) => {
      files.forEach(file => {
        filesName.push(file);
      });
      resolve(filesName);
    });
  });
}

function getDeviceLocalInfo(deviceId) {
  return new Promise(resolve => {
    Device.findOne({
      webexId: deviceId
    }, function (err, doc) {
      if (err) {
        console.log(err);
      } else {
        resolve(doc);
      }
    });
  });
}

function getBackupedDevices() {
  return new Promise(resolve => {
    Device.find({
      hasBackupFile: true
    }, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        resolve(docs);
      }
    });
  });
}

function generateChecksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex');
}