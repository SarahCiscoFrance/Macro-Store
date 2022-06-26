const fs = require("fs");
const xml2js = require('xml2js');
const request = require("request");
const path = require('path');
var crypto = require('crypto');
const xAPIUtils = require("../xAPICloud/utils");
const ApplescriptAction = require('../utils/applescript-action')
const ComputerAction = require('../utils/computer-action')
const mongoose = require("mongoose");
const Device = require('../models/device');
const Template = require('../models/template');
const Macro = require('../models/macro');
const Computer = require('../models/computer');
const {
  promisify
} = require("util");
const {
  response
} = require("express");
const { env } = require("process");

mongoose.connect("mongodb://localhost:27017/macro-store", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

exports.getIndex = async (req, res, next) => {
  const templates = await Template.find({}).exec();
  res.render("index", {
    title: "Macro Store",
    path: "/",
    templates: templates,
    backupedDevices: await getBackupedDevices()
  });
};

exports.getExpert = async (req, res, next) => {
  res.render("expert", {
    title: "Expert Mode",
    path: "/expert",
    devices: await xAPIUtils.getDevices(),
    backupedDevices: await getBackupedDevices(),
    marcosAvailable: await getFilesName("./public/uploads/macros/"),
    panelAvailable: await getFilesName("./public/uploads/panels/"),
    backupsAvailable: await getFilesName("./public/uploads/backups/"),
  });
};

exports.getAdvanced = async (req, res, next) => {
  const computers = await Computer.find({}).exec();
  let promises = [];
  let github_promises = [];
  let branding_promises = [];
  let audio_promises = [];
  let extensions_promises = [];

  const githubMacros = await Macro.find({});
  githubMacros.forEach(githubMacro => {
    github_promises.push(readGithubRepo(githubMacro.repo_api_url))
  });

  xAPIUtils.getDevices().then(devices => {
    devices.filter(e => e.connectionStatus != "disconnected").forEach(device => {
      promises.push(xAPIUtils.getAllMacroFromDevice(device.id));
      branding_promises.push(xAPIUtils.getBrandingFromDevice(device.id, "Branding"));
      audio_promises.push(xAPIUtils.getAudioInfoFromDevice(device.id));
      extensions_promises.push(xAPIUtils.getExtensionsFromDevice(device.id));
    });

    Promise.all(promises).then(macrosPerDevice => {
      const devicesWithMacros = devices.filter(e => e.connectionStatus != "disconnected").map((obj, index) => ({
        ...obj,
        macros: macrosPerDevice[index]
      })).concat(devices.filter(e => e.connectionStatus == "disconnected").map((obj) => ({
        ...obj,
        macros: []
      })));

      Promise.all(github_promises).then(async github_repo_files => {
        const githubMacrosUpdated = githubMacros.map((githubMacro, index) => ({
          ...githubMacro._doc, // <-- ._doc needed because mongoose return not useful info. Only info in ._doc are useful
          have_xml_file: github_repo_files[index].some(e => e.name.includes('.xml')),
          have_readme_file: github_repo_files[index].some(e => e.name.includes('.md')),
          macro_content_url: github_repo_files[index][github_repo_files[index].findIndex(e => e.name.includes('.js') && !e.name.includes('.json'))].url,
          xml_file_content_url: github_repo_files[index].some(e => e.name.includes('.xml')) ? github_repo_files[index][github_repo_files[index].findIndex(e => e.name.includes('.xml'))].url : null,
          readme_html_url: github_repo_files[index].some(e => e.name.includes('.md')) ? github_repo_files[index][github_repo_files[index].findIndex(e => e.name.includes('.md'))].html_url : null,
        }))

        const brandings = await Promise.all(branding_promises).catch(err => {
          console.log(err)
          res.json({
            code: "500",
            msg: err.message
          });
        });

        const audioResult = await Promise.all(audio_promises).catch(err => {
        console.log(err)
        res.json({
          code: "500",
          msg: err.message
          });
        });

        const audioInfo = audioResult.map(i => ({
          deviceId: i.deviceId,
          volume: i.result.Audio.Volume,
          ultrasound: i.result.Audio.Ultrasound.Volume
        }))

        const uiExtensionsResult = await Promise.all(extensions_promises).catch(err => {
          console.log(err)
          res.json({
            code: "500",
            msg: "Error when trying to get UI extensions informations from Webex. Please Reload this page."
            });
        });

        res.render("advanced", {
          title: "Advanced Mode",
          path: "/advanced",
          devices: devicesWithMacros,
          githubMacros: githubMacrosUpdated,
          uiExtensions: uiExtensionsResult,
          brandings: brandings,
          computers: computers,
          audio: audioInfo
        });

      }).catch(err => {
        console.log(err)
        res.json({
          code: "500",
          msg: "Failed to retrive Github information"
        });
      });

    }).catch(err => {
      console.log(err)
      res.json({
        code: "500",
        msg: "Failed to retrive information about macro"
      });
    })
  });

};

exports.uploadFile = async (req, res, next) => {
  let fileIsValid = false;
  let sampleFile;
  let uploadPath;
  let fileNames;
  const fileType = req.body.basicRadio;
  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send("No files were uploaded.");
    return;
  }

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
      res.redirect("/expert");
    });
  }
};

exports.saveFile = async (req, res, next) => {
  const devices = [].concat(req.body.deviceSelected);
  const macros = [].concat(req.body.macroSelected);
  const panels = [].concat(req.body.panelSelected);

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
              "True",
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

exports.uploadBranding = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  const deviceId = req.body.deviceId;
  const brandingImg = req.files.brandingImg;
  let base64data = brandingImg.data.toString('base64');

  try{
    await xAPIUtils.uploadBranding(deviceId, base64data, "Branding")
    res.json({
      code: "204"
    });
  }
  catch(error){
    res.json({
      code: "500",
      msg: error.message
    });
  }
 
};

exports.restartDevice = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  try {
    const response = await xAPIUtils.restartDevice(deviceId);
    const payload = JSON.parse(response.body)
    if (response.statusCode >= 400){
      res.json({
        code: "500",
        msg: payload.message
      });
    }
    else{
      res.json({
        code: "204"
      });
    }
  } catch (error) {
    console.error(error);
    res.json({
      code: "500",
      msg: error.message
    });
  }
};

exports.setStandbyMode = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  const mode = req.params.mode;
  if(mode === "Activate" || mode === "Deactivate"){
    try {
      const response = await xAPIUtils.setStandByMode(deviceId, mode);
      const payload = JSON.parse(response.body)
      if(response.statusCode > 400){
        res.json({
          code: "500",
          msg: payload.errors[0].description
        });
      }
      else{
        res.json({
          code: "204",
          msg: `StandBy Mode ${mode}!`
        });
      }
    } catch (error) {
      res.json({
        code: "500",
        msg: error.message
      });
    }
    
  }else{
    res.json({
      code: "500",
      msg: "Value of mode should be Activate or Deactivate"
    });
  }
}

exports.setVolume = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  const level = parseInt(req.body.volumeLevel);
  try {
    var response = await xAPIUtils.setVolume(deviceId, level);
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

exports.clearBranding = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  try {
    await xAPIUtils.clearBranding(deviceId)
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

exports.setCurrentConfiAsBackup = (req, res, next) => {
  const deviceId = req.body.deviceId;
  const deviceName = req.body.deviceName;
  const deviceIp = req.body.deviceIp;
  const deviceMac = req.body.deviceMac;
  const backupFileName = `backup-${deviceIp}.zip`;
  linkBackupToDevice(deviceId, deviceName, deviceIp, deviceMac, backupFileName).then(() => {
      res.json({
        code: "204"
      });
    })
    .catch(err => {
      res.json({
        code: "500",
        msg: err.message
      });
    });
};

exports.getDevice = (req, res, next) => {
  const deviceId = req.params.deviceId;
  xAPIUtils.getDeviceDetail(deviceId).then(async deviceDetails => {
    res.render("device", {
      title: "Device",
      path: "", //temporary
      deviceDetails: deviceDetails,
      deviceLocalDetails: await getDeviceLocalInfo(deviceDetails.mac),
      macros: await xAPIUtils.getAllMacroFromDevice(deviceId),
      marcosAvailable: await getFilesName("./public/uploads/macros/"),
      panelAvailable: await getFilesName("./public/uploads/panels/"),
      backupsAvailable: await getFilesName("./public/uploads/backups/"),
    });
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
    fs.readFile('./public/uploads/templates/default/' + backupFileName, function (err, data) {
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
      promises.push(xAPIUtils.restoreBackup(device.webexId, device.fileChecksum, device.backupFileName, 'default'))
    });

    Promise.all(promises).then((values) => {
      console.log(values);
      res.json({
        code: "204"
      });
    });
  });
};

exports.saveTemplate = async (req, res, next) => {
  console.log("START SAVING...")
  const {
    templateName,
    templateDescription,
    devicesIp,
    devicesId,
    devicesMac,
    devicesName,
    isDefaultTemplate,
    selectedComputers,
    selectedWebexDevices
  } = req.body
  console.log(req.body)
  var devicesInfo = devicesIp.map((ip, i) => ({
    ip,
    id: devicesId[i],
    mac: devicesMac[i],
    name: devicesName[i]
  }))

  devicesInfo = devicesInfo.filter(e => selectedWebexDevices.includes(e.id))

  let computersIds = Array.isArray(selectedComputers) ? selectedComputers : [selectedComputers]
  console.log(selectedComputers, computersIds)
  const computersInfo = await Computer.find().where('_id').in(computersIds).exec();

  var promises = [];
  const templatePath = isDefaultTemplate ? `./public/uploads/templates/default` : `./public/uploads/templates/${templateName}`
  if (!fs.existsSync(templatePath)) {
    await fs.promises.mkdir(templatePath, {
      recursive: true
    }).catch(console.error);
  } else {
    fs.readdir(templatePath, (err, files) => {
      if (err) throw err;
      for (const file of files) {
        fs.unlink(path.join(templatePath, file), err => {
          if (err) throw err;
        });
      }
    });
  }



  devicesInfo.forEach(deviceInfo => {
    const {
      ip,
      mac
    } = deviceInfo
    console.log("STEP : " + ip)
    const backupFileName = `backup-${ip}.zip`;
    promises.push(xAPIUtils.getBackupFile(ip, backupFileName, isDefaultTemplate ? 'default' : templateName))
  });

  Promise.all(promises).then(async (values) => {
      console.log("SAVING RESULT :")
      console.log(values);
      if (!isDefaultTemplate) {
        const template = new Template({
          name: templateName,
          description: templateDescription,
          path: templatePath,
          involvedWebexDevices: devicesInfo.map((device, i) => ({
            mac: device.mac,
            name: device.name,
            backupFileName: `backup-${device.ip}.zip`
          })),
          involvedComputers: computersInfo
        });
        template.save().then(() => {
          res.json({
            code: "204"
          });
        }).catch(error => {
          res.json({
            code: "500",
            msg: error.code === 11000 ? "Template with this name already exist" :  error.message
          });
        })
      } else {
        const savePromises = [];
        devicesInfo.forEach(device => {
          savePromises.push(linkBackupToDevice(device.id, device.name, device.ip, device.mac, `backup-${device.ip}.zip`))
        })

        Promise.all(savePromises).then(() => {
          res.json({
            code: "204"
          });
        }).catch(error => {
          res.json({
            code: "500",
            msg: error.message
          });
        })
      }
    })
    .catch(error => {
      fs.readdir(templatePath, (err, files) => {
        if (err) throw err;
        for (const file of files) {
          fs.unlink(path.join(templatePath, file), err => {
            if (err) throw err;
          });
        }
      });
      console.log(error)
      res.json({
        code: "500",
        msg: error.message
      });
    });
};


exports.deleteTemplate = async (req, res, next) => {
  const templateId = req.params.id;
  const template = await Template.findOne({_id: templateId});

  fs.rmdir(template.path, { recursive: true }, (err) => {
    if (err) {
      return res.json({
        code: "500",
        msg: err.message
      });
    }
  });


  await Template.deleteOne({_id: templateId}).exec().catch(error => {
    return res.json({
      code: "500",
      msg: error.message
    });
  });
  
  res.json({
    code: "204"
  });
};


exports.loadTemplate = async (req, res, next) => {
  const templateId = req.params.id;
  const template = await Template.findOne({
    _id: templateId
  });
  const wbxDevices = await xAPIUtils.getDevices();
  let promises = [];
  template.involvedWebexDevices.forEach(async device => {
    //here we get the updated info from Webex API about curent device
    const webexDeviceLastInfo = wbxDevices.find(e => {
      return e.mac === device.mac
    });

    const checksum = await generateChecksumForFile(`${template.path}/${device.backupFileName}`).catch(err => {
      res.json({
        code: "500",
        msg: err.message
      });
    })

    promises.push(xAPIUtils.restoreBackup(webexDeviceLastInfo.id, checksum, device.backupFileName, template.name))
  });

  template.involvedComputers.forEach(async computer => {
    const computersLastInfo = await Computer.findById(computer.id).exec();
    const desktopBackgroundFilename = computer.desktopBackground.replace(/^.*[\\\/]/, '')
    const script = ApplescriptAction.generateScript(computer.volumeLevel, computer.bluetooth, computer.closeApps, computer.appsToStart, `./${desktopBackgroundFilename}`)
    promises.push(ComputerAction.sendScript(computersLastInfo, script))
  })

  Promise.all(promises).then(() => {
    res.json({
      code: "204"
    });
  }).catch(err => {
    res.json({
      code: "500",
      msg: err.message
    });
  });

};

exports.getGithubMacro = async (req, res) => {
  const macros = await Macro.find({});
  res.send(macros)
};

exports.declareGithubMacro = async (req, res) => {
  const macroRepositoryUrl = req.body.repo_url;
  const macroNeedAdjustment = req.body.need_adjustment;

  //Ckeck if provided repo_url is valid
  const elements = macroRepositoryUrl.replace('https://', '').split('/')

  const isValid = elements[0] == 'github.com' && (elements.length == 3 || elements.length == 6);

  if (isValid) {
    const author = elements[1];
    const repo_name = elements[2];
    let nested_repo = (elements.length == 6);
    const dirName = nested_repo ? elements[5] : null;

    const repo_api_url = nested_repo ? `https://api.github.com/repos/${author}/${repo_name}/contents/${dirName}` : `https://api.github.com/repos/${author}/${repo_name}/contents/`;

    const repo_files = await readGithubRepo(repo_api_url);
    const have_js_file = repo_files.some(e => e.name.includes('.js'))
    if (have_js_file) {
      // const have_xml_file = repo_files.some(e => e.name.includes('.xml'))
      // const have_readme_file = repo_files.some(e => e.name.includes('.md'))
      const macroName = repo_files[repo_files.findIndex(e => e.name.includes('.js') && !e.name.includes('.json'))].name
      const newMacro = new Macro({
        name: macroName,
        repo_url: macroRepositoryUrl,
        repo_api_url: repo_api_url,
        repo_name: repo_name,
        author: author,
        need_adjustment: macroNeedAdjustment ? true : false
      });

      const macro = await newMacro.save().catch(err => {
        if (err.name === 'MongoError' && err.code === 11000) {
          // Duplicate error
          res.json({
            code: "500",
            msg: 'Macro Name or Url already registered!'
          });
        } else {
          // Some other error
          res.status(422).send(err);
        }

      });

      if (macro){
        res.json({
          code: "204"
        });
      }
    } else {
      res.json({
        code: "500",
        msg: 'No macro detected. Your repository should have a .js file!'
      });
    }
  } else {
    res.json({
      code: "500",
      msg: 'The provided url is not a valid GitHub repository url!'
    });
  }
};

exports.deleteGithubMacro = async (req, res) => {
  const githubMacroId = req.params.id;
  await Macro.deleteOne({_id: githubMacroId}).exec().catch(error => {
    return res.json({
      code: "500",
      msg: error.message
    });
  });
  res.json({
    code: "204"
  });
};

exports.addGithubMacroToDevice = async (req, res) => {
  const deviceId = req.body.deviceId;
  const macroContentUrl = req.body.macroContentUrl;
  const xmlFileContentUrl = req.body.xmlFileContentUrl ? req.body.xmlFileContentUrl : null;

  const file = await readGithubFile(macroContentUrl);

  let promises = []
  promises.push(xAPIUtils.saveMacro(deviceId, file.name.replace(".js", ""), "True", "True", file.content))
  if(xmlFileContentUrl){
    const panel = await readGithubFile(xmlFileContentUrl)
    const panel_content = panel.content.replace("\ufeff", "").replace("o;?","")
    var parser = new xml2js.Parser();
    const result = await promisify(parser.parseString)(panel_content)
    const panelId = result.Extensions.Panel[0].PanelId[0];
    promises.push(xAPIUtils.savePanel(deviceId, panelId, panel_content))
  }
  Promise.all(promises).then(response => {
    res.json({
      code: "204"
    });
  }).catch(err => {
    console.error(err)
    res.json({
      code: "500",
      msg: err.message
    });
  })

};

exports.updateMacroOnDevice = async (req, res) => {
  const deviceId = req.body.deviceId;
  const macroName = req.body.macroName;
  const macroContent = req.body.macroContent;

  xAPIUtils.saveMacro(deviceId, macroName, "True", "True", macroContent).then(resp => {
    console.log(resp)
    res.json({
      code: "204"
    });
  }).catch(err => {
    res.json({
      code: "500",
      msg: err.message
    });
  })



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

function getDeviceLocalInfo(deviceMac) {
  return new Promise(resolve => {
    Device.findOne({
      mac: deviceMac
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

async function generateChecksumForFile(filePath) {
  const data = await promisify(fs.readFile)(filePath)
  return generateChecksum(data, "sha512");
}

async function linkBackupToDevice(webexId, name, ip, mac, backupFileName) {
  return new Promise(async (resolve, reject) => {
    try {
      const checksum = await generateChecksumForFile('./public/uploads/templates/default/' + backupFileName)
      await Device.updateOne({
        mac: mac
      }, {
        webexId: webexId,
        name: name,
        mac: mac,
        ip: ip,
        backupFileName: backupFileName,
        hasBackupFile: true,
        fileChecksum: checksum
      }, {
        upsert: true
      }, function (err, save) {
        if (err) {
          reject(err);
        } else {
          resolve("Backup linked to device!");
        }
      });
    } catch (error) {
      reject(error);
    }
  })

}

async function readGithubRepo(repo_api_url) {
  var options = {
    'method': 'GET',
    'url': repo_api_url,
    'headers': {
      'user-agent': 'node.js',
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN
    }
  };
  const response = await promisify(request)(options)
  return JSON.parse(response.body)
}

async function readGithubFile(url) {
  var options = {
    'method': 'GET',
    'url': url,
    'headers': {
      'user-agent': 'node.js',
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN
    }
  };
  const response = await promisify(request)(options)
  const parsedResponse = JSON.parse(response.body)
  const fileName = parsedResponse.name
  const fileContent = Buffer.from(parsedResponse.content, 'base64').toString('ascii')
  return {
    name: fileName,
    content: fileContent
  }

}