var Client = require('ssh2').Client;
var fs = require("fs"); // Use node filesystem
const axios = require('axios');

module.exports = {

    uploadFile: function(computer, from, to) {
        return new Promise((resolve, reject) => {
            var conn = new Client();
            var connSettings = {
                host: computer.ip,
                port: 22,
                username: computer.username,
                password: computer.password
            };
            conn.on('ready', function() {
                conn.sftp(function(err, sftp) {
                     if (err) throw err;        
                    var readStream = fs.createReadStream(from);
                    var writeStream = sftp.createWriteStream(to);
                    writeStream.on('close',function () {
                        console.log( "- file transferred succesfully" );
                        resolve(1)
                    });
            
                    writeStream.on('end', function () {
                        console.log( "sftp connection closed" );
                        conn.close();
                    });
            
                    // initiate transfer of file
                    readStream.pipe( writeStream );
                });
            }).connect(connSettings);
        });

    },

    sendScript: function(computer, applescriptContent) {

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
                'API-Key': 'C1sc0123',
                'Content-Type': 'application/json'
            },
            data: data
        };
    
        return axios(config)
    }

}