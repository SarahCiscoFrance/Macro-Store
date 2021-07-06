const request = require('request');

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
        'method': 'POST',
        'url': 'https://webexapis.com/v1/xapi/command/Macros.Macro.Save',
        'headers': {
          'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "deviceId": deviceId,
          "arguments": {
            "Name": macroName,
            "Overwrite": overWrite,
            "Transpile": transpile
          },
          "body": macroContent
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
        'method': 'GET',
        'url': 'https://webexapis.com/v1/devices',
        'headers': {
          'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
          'Content-Type': 'application/json'
        }
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        resolve(JSON.parse(response.body).items);
      });
    });
  },

  /**
   * Activates a macro created on this device
   * @param {string} deviceId The ID of the device
   * @param {string} macroName Specifies the name of the macro to activate
   */
  activateMacro: function (deviceId, macroName) {
    var options = {
      'method': 'POST',
      'url': 'https://webexapis.com/v1/xapi/command/Macros.Macro.Activate',
      'headers': {
        'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "deviceId": deviceId,
        "arguments": {
          "Name": macroName
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
      'method': 'POST',
      'url': 'https://webexapis.com/v1/xapi/command/Macros.Macro.RemoveAll',
      'headers': {
        'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "deviceId": deviceId,
        "arguments": {}
      })

    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
      //console.log(response.body);
    });
  },


  savePanel: function (deviceId, PanelId, xml) {
    var options = {
      'method': 'POST',
      'url': 'https://webexapis.com/v1/xapi/command/UserInterface.Extensions.Panel.Save',
      'headers': {
        'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "deviceId": deviceId,
        "arguments": {
          "PanelId": PanelId
        },
        "body": xml.replace(/(\r\n|\n|\r)/gm, "")
      })

    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });
  },

  removeAllPanel: function (deviceId) {
    var options = {
      'method': 'POST',
      'url': 'https://webexapis.com/v1/xapi/command/UserInterface.Extensions.Clear',
      'headers': {
        'Authorization': 'Bearer ' + process.env.BOT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "deviceId": deviceId
      })

    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });
  }

}