const axios = require('axios');
const path = require('path');
const util = require('util');

const Computer = require('../models/computer');

const ApplescriptAction = require('../utils/applescript-action')
const ComputerAction = require('../utils/computer-action')

exports.addComputer = async (req, res, next) => {
    const {
        name,
        ip,
        username,
        password
    } = req.body;
    const computer = new Computer({
        ip: ip,
        username: username,
        password: password,
        name: name,
        type: "mac",
        bluetooth: false,
        volumeLevel: 50,
        closeApps: false,
        appsToStart: [],
        desktopBackground: "",
        desktopBackgroundBase64: ""

    })
    computer.save().then(result => {
        res.json({
            code: "204"
        });
    }).catch(err => {
        if (err.name === 'MongoError' && err.code === 11000) {
            // Duplicate error
            res.json({
                code: "500",
                msg: 'Computer already registered!'
            });
        } else {
            // Some other error
            console.log(err)
            res.status(422).send(err);
        }

    })
};

exports.updateComputer = async (req, res, next) => {
    const computerId = req.params.id;
    const {
        name,
        ip,
        username,
        password
    } = req.body;

    Computer.findByIdAndUpdate(computerId, {
        name: name,
        ip: ip,
        username: username,
        password: password
    }, (err, doc) => {
        if (err) {
            console.log(err)
            if (err.code === 11000) {
                res.json({
                    code: "500",
                    msg: `Computer with ${JSON.stringify(err.keyValue)} already exist !`
                });
            } else {
                res.json({
                    code: "500",
                    msg: `Internal Server Error`
                });
            }
        } else {
            res.json({
                code: "204"
            });
        }
    });
};

exports.deleteComputer = async (req, res, next) => {
    const computerId = req.params.id;

    await Computer.deleteOne({
        _id: computerId
    }).exec().catch(error => {
        return res.json({
            code: "500",
            msg: error.message
        });
    });

    res.json({
        code: "204"
    });
};

exports.sendCommand = async (req, res, next) => {
    const {
        computerId,
        volumeInput,
        bluetooth,
        closeApps,
        appsToStart
    } = req.body;
    let haveBackground = true;
    const computer = await Computer.findById(computerId);
    console.log(req.body)
    if (!req.files || Object.keys(req.files).length === 0) {
        haveBackground = false;
    }

    let applescriptContent = '';

    if (volumeInput && Number(volumeInput) >= 0 && Number(volumeInput) <= 100) {
        applescriptContent += ApplescriptAction.setVolume(volumeInput)
        applescriptContent += `\n\n`
        computer.volumeLevel = Number(volumeInput);
    } else {
        return res.json({
            code: "500",
            msg: "Volume is required and should be a number between 0 and 100 %"
        });
    }

    if (closeApps && !(closeApps != '0' && closeApps != '1')) {
        if (Number(closeApps)) {
            applescriptContent += ApplescriptAction.closeApps()
            applescriptContent += `\n\n`
            computer.closeApps = true;
        } else {
            computer.closeApps = false;
        }
    }

    if (bluetooth && !(bluetooth != '0' && bluetooth != '1')) {
        applescriptContent += ApplescriptAction.setBluetooth(Number(bluetooth) ? 'Activer' : 'Désactiver')
        applescriptContent += `\n\n`
        computer.bluetooth = bluetooth == '1';
    }

    if (appsToStart) {
        applescriptContent += 'delay 5\n'

        if (Array.isArray(appsToStart)) {
            applescriptContent += ApplescriptAction.startApps(appsToStart)
            applescriptContent += `\n`
            computer.appsToStart = appsToStart

        } else if (typeof appsToStart == "string") {
            applescriptContent += `tell application "${appsToStart}" to activate\n`
            computer.appsToStart = [appsToStart]
        } else {
            return res.json({
                code: "500",
                msg: "appsToStart should be an array or a string"
            });
        }
    }
    else{
        computer.appsToStart = []
    }

    let background_promises = []
    let promises = []

    if (haveBackground) {
        const backgroundFile = req.files.brandingImg;
        const filename = backgroundFile.name.replace(/\s+/g, '-');
        const file_path = `./public/backgrounds/${filename}`
        computer.desktopBackground = file_path
        computer.desktopBackgroundBase64 = backgroundFile.data.toString('base64');
        background_promises.push(util.promisify(backgroundFile.mv)(file_path))
        console.log(backgroundFile.name)
        background_promises.push(ComputerAction.uploadFile(computer, file_path, `/Users/${computer.username}/Automation/${filename}`))
        applescriptContent += ApplescriptAction.setBackground(`./${backgroundFile.name}`)
    }
    else if(computer.backgroundFile){
        const desktopBackgroundFilename = computer.desktopBackground.replace(/^.*[\\\/]/, '')
        applescriptContent += ApplescriptAction.setBackground(`/Users/${computer.username}/Automation/${desktopBackgroundFilename}`)
    }
    console.log(applescriptContent)


    const data = {
        host: computer.ip,
        username: computer.username,
        password: computer.password,
        body: applescriptContent
    }

    var config = {
        method: 'post',
        url: 'http://10.1.20.24:15108/sendCommand/mac/',
        headers: {
            'API-Key': process.env.ROOM_CONTROL_API_KEY,
            'Content-Type': 'application/json'
        },
        data: data
    };

    promises.push(axios(config))
    promises.push(computer.save())

    if (haveBackground) {
        Promise.all(background_promises).then(() => {
            Promise.all(promises).then(() => {
                res.json({
                    code: "204"
                });
            }).catch(error => {
                console.log(error)
                const errorMsg = error.response ? error.response.data.message : error.message
                res.json({
                    code: "500",
                    msg: errorMsg
                });
            })
        }).catch(error => {
            console.log(error)
            res.json({
                code: "500",
                msg: `Can't upload desktop image on the Computer : ${computer.name}`
            });
        })
    }
    else {
        Promise.all(promises).then(() => {
            res.json({
                code: "204"
            });
        }).catch(error => {
            console.log(error)
            const errorMsg = error.response ? error.response.data.message : error.message
            res.json({
                code: "500",
                msg: errorMsg
            });
        })
    }

};