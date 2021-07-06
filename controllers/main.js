const fs = require('fs');
const xAPIUtils = require("../xAPICloud/utils");
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/macro-store', {
    useNewUrlParser: true
});

exports.getIndex = async (req, res, next) => {
    res.render('index', {
        title: 'Macro Store',
        devices: await xAPIUtils.getDevices(),
        marcosAvailable: await getFilesName('./uploads/macros/'),
        panelAvailable: await getFilesName('./uploads/panels/'),
    });
};

exports.uploadFile = async (req, res, next) => {
    let sampleFile;
    let uploadPath;
    let fileNames;
    const fileType = req.body.basicRadio;
    console.log(req.body.basicRadio);
    if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    console.log('req.files >>>', req.files); // eslint-disable-line

    sampleFile = req.files.sampleFile;


    if (fileType === "macro") {
        fileNames = await getFilesName("./uploads/macros/");
        if (fileNames.includes(sampleFile.name)) {
            let new_name = sampleFile.name;
            new_name = new_name.replace('.js', '');
            new_name = new_name + '_' + (new Date().toJSON().slice(0, 10)) + '.js'
            uploadPath = './uploads/macros/' + new_name;
        } else {
            uploadPath = './uploads/macros/' + sampleFile.name;
        }
    } else if (fileType === "panel") {
        fileNames = await getFilesName("./uploads/panels");
        if (fileNames.includes(sampleFile.name)) {
            let new_name = sampleFile.name;
            new_name = new_name.replace('.js', '');
            new_name = new_name + '_' + (new Date().toJSON().slice(0, 10)) + '.js'
            uploadPath = './uploads/panels/' + new_name;
        } else {
            uploadPath = './uploads/panels/' + sampleFile.name;
        }
    } else {
        res.status(400).send('Radio button should be equal to macro or panel.');
    }

    sampleFile.mv(uploadPath, function (err) {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect('/');
    });
};

exports.saveFile = async (req, res, next) => {
    const devices = [].concat(req.body.deviceSelected);
    const macros = [].concat(req.body.macroSelected);
    const panels = [].concat(req.body.panelSelected);

    console.log(devices, macros, panels);
    devices.forEach(device => {
        if (macros.length > 0 && !macros.includes(undefined)) {
            macros.forEach(macro => {
                macro = JSON.parse(macro);
                const macroText = fs.readFileSync("./uploads/macros/" + macro.macroName, {
                    encoding: 'utf-8'
                });

                xAPIUtils.saveMacro(device, macro.macroName.replace('.js', ''), "True", "False", macroText).then(() => {
                    if (macro.activationOnInstall === 'True') {
                        xAPIUtils.activateMacro(device, macro.macroName.replace('.js', ''));
                    }
                });
            });
        }
        if (panels.length > 0 && !panels.includes(undefined)) {
            panels.forEach(panel => {
                const panelContent = fs.readFileSync("./uploads/panels/" + panel, {
                    encoding: 'utf-8'
                });

                xAPIUtils.savePanel(device, panel.replace('.xml', '') + Date.now(), panelContent);
            });
        }
    });
    res.status(204).send();
}

exports.deleteFile = (req, res, next) => {
    const filePath = req.body.file;
    try {
        fs.unlinkSync(filePath)
        //file removed
        res.redirect('/');
    } catch (err) {
        console.error(err)
        res.sendStatus(500);
    }
};

exports.removeAllMacro = (req, res, next) => {
    const devices = [].concat(req.body.deviceSelected);
    const isallMacroBtnChecked = req.body.allMacro;
    const isallPanelBtnChecked = req.body.allPanel;
    console.log(devices, isallMacroBtnChecked, isallPanelBtnChecked)
    if (isallMacroBtnChecked == 'on') {
        devices.forEach(deviceId => {
            xAPIUtils.removeAllMacro(deviceId);
        });
    }
    if (isallPanelBtnChecked == 'on') {
        devices.forEach(deviceId => {
            xAPIUtils.removeAllPanel(deviceId);
        });
    }
    res.status(204).send();
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