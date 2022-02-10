const request = require("request");
const fs = require("fs");
const {
  promisify
} = require("util");

module.exports = {
  /**
   * Send a macro to the device identified by deviceId
   * @param {string} deviceId The ID of the device
   * @param {string} macroName The name of the macro that is saved.
   * @param {string} overWrite Overwrites the existing content or not. Use "True" or "False".
   * @param {string} transpile Translates current JavaScript language features into EcmaScript 5.0/5.1. Use "True" or "False".
   * @param {string} macroContent The content of the macro
   */
  saveMacro: function (deviceId, macroName, overWrite, transpile, macroContent) {
    return new Promise(resolve => {
      var options = {
        method: "POST",
        url: "https://webexapis.com/v1/xapi/command/Macros.Macro.Save",
        headers: {
          Authorization: "Bearer " + process.env.BOT_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deviceId: deviceId,
          arguments: {
            Name: macroName,
            Overwrite: overWrite,
            Transpile: transpile
          },
          body: macroContent
        })
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(response.body);
      });
    });
  },

  getDevices: function () {
    return new Promise(resolve => {
      var options = {
        method: "GET",
        url: "https://webexapis.com/v1/devices",
        headers: {
          Authorization: "Bearer " + process.env.BOT_TOKEN,
          "Content-Type": "application/json"
        }
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body).items);
      });
    });
  },

  getDeviceDetail: function (deviceId) {
    return new Promise(resolve => {
      var options = {
        'method': 'GET',
        'url': 'https://webexapis.com/v1/devices/' + deviceId,
        'headers': {
          'Authorization': 'Bearer ' + process.env.BOT_TOKEN
        }
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body));
      });
    });
  },

  /**
   * Activates or Deactivates a macro created/running on this device
   * @param {string} deviceId The ID of the device
   * @param {string} macroName Specifies the name of the macro to activate
   * @param {boolean} active true for activation or false for desactivtion
   */
  setMacroActivation: function (deviceId, macroName, active) {
    var url = "https://webexapis.com/v1/xapi/command/Macros.Macro." + (active ? "Activate" : "Deactivate");
    var options = {
      method: "POST",
      url: url,
      headers: {
        Authorization: "Bearer " + process.env.BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId,
        arguments: {
          Name: macroName
        }
      })
    };
    request(options, async function (error, response) {
      if (error) throw new Error(error);
      await restartMacrosRuntime(deviceId).catch(err => {throw new Error(err)});
    });
  },

  /**
   * Removes all of the macros created on this device.
   * @param {string} deviceId The ID of the device
   */
  removeAllMacro: function (deviceId) {
    var options = {
      method: "POST",
      url: "https://webexapis.com/v1/xapi/command/Macros.Macro.RemoveAll",
      headers: {
        Authorization: "Bearer " + process.env.BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId,
        arguments: {}
      })
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
    });
  },

  removeMacro: function (deviceId, macroName) {
    var options = {
      method: "POST",
      url: "https://webexapis.com/v1/xapi/command/Macros.Macro.Remove",
      headers: {
        Authorization: "Bearer " + process.env.BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId,
        arguments: {
          "Name": macroName
        }
      })
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
    });
  },

  savePanel: function (deviceId, PanelId, xml) {
    var options = {
      method: "POST",
      url: "https://webexapis.com/v1/xapi/command/UserInterface.Extensions.Panel.Save",
      headers: {
        Authorization: "Bearer " + process.env.BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId,
        arguments: {
          PanelId: PanelId
        },
        body: xml.replace(/(\r\n|\n|\r)/gm, "")
      })
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
    });
  },

  removeAllPanel: function (deviceId) {
    var options = {
      method: "POST",
      url: "https://webexapis.com/v1/xapi/command/UserInterface.Extensions.Clear",
      headers: {
        Authorization: "Bearer " + process.env.BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: deviceId
      })
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
    });
  },

  /**
   * Return all the macro installed on this device
   * @param {string} deviceId The ID of the device
   */
  getAllMacroFromDevice: function (deviceId) {
    return new Promise(resolve => {
      var options = {
        method: "POST",
        url: "https://webexapis.com/v1/xapi/command/Macros.Macro.Get",
        headers: {
          Authorization: "Bearer " + process.env.BOT_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          arguments: {
            Content: "False"
          },
          deviceId: deviceId
        })
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        const result = JSON.parse(response.body).result
        if (result.hasOwnProperty('Macro')) {
          resolve(result.Macro);
        } else {
          resolve([]);
        }

      });
    });
  },

  restoreBackup: function (deviceId, checksum, filename, templateFolderName = null) {
    return new Promise(resolve => {
      var options = {
        'method': 'POST',
        'url': 'https://webexapis.com/v1/xapi/command/Provisioning.Service.Fetch',
        'headers': {
          'Authorization': "Bearer " + process.env.BOT_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "deviceId": deviceId,
          "arguments": {
            "Checksum": checksum,
            "ChecksumType": "SHA512",
            "Mode": "Add",
            "Origin": "Provisioning",
            "URL": `http://websrv2.ciscofrance.com:15139/uploads/${templateFolderName ? `templates/${templateFolderName}/${filename}` : `backups/${filename}` }`
            // "URL": `http://1464-80-215-246-177.ngrok.io/uploads/${templateFolderName ? `templates/${templateFolderName}/${filename}` : `backups/${filename}` }`
          }
        })

      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body));
      });
    });
  },

  getBackupFile: function (ip, filename, templateName = null) {
    return new Promise(function (resolve, reject) {
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
      try {
        const pathToCreateFile = templateName ? `./public/uploads/templates/${templateName}/${filename}` : `./public/uploads/backups/${filename}`
        var options = {
          'method': 'GET',
          'url': `http://presence:C1sc0123@${ip}/api/backup`,
          'headers': {
            'Content-Type': 'application/json'
          },
        }
        request(options, function (error, response) {
            if (error) reject(error);
            resolve({
              ip: ip,
              status: "succes"
            });
          })
          .pipe(fs.createWriteStream(pathToCreateFile))
          .on('close', function () {
            console.log('File written!');
          });
      } catch (error) {
        reject(error);
      }
    });
  }
};



/**
 * Restarts all of the macros set up on this device.
 * @param {string} deviceId The webex ID of the device
 */
function restartMacrosRuntime(deviceId) {
  var options = {
    method: "POST",
    url: 'https://webexapis.com/v1/xapi/command/Macros.Runtime.Restart',
    headers: {
      Authorization: "Bearer " + process.env.BOT_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      deviceId: deviceId
    })
  };

  return promisify(request)(options)
}