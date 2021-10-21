const request = require("request");

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
    console.log(url);
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
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
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
      //console.log(response.body);
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
      //console.log(response.body);
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
      console.log(response.body);
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
      console.log(response.body);
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
        resolve(JSON.parse(response.body).result.Macro);
      });
    });
  },

  restoreBackup: function (deviceId, checksum, filename) {
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
            "URL": "http://websrv2.ciscofrance.com:15139/uploads/backups/" + filename
          }
        })

      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body));
      });
    });
  }
};