// Simulation Panel
// Version 2.0
// by rudferna@cisco.com

const xapi = require('xapi');
xapi.config.set("Standby Signage Mode", "On");
const url1 = "http://10.1.20.21/COVID/";
var alertDuration = 1;
const copyDuration = alertDuration;

xapi.Config.Standby.Signage.Url.get().then((originUrl) => {
    const theURL = originUrl;

    xapi.event.on('UserInterface Extensions Widget Action', (event) => {
        alertDuration = copyDuration;
        if (event.WidgetId == 'bouton_too_many' && event.Type !== 'clicked') {
            xapi.command('UserInterface Message TextLine Display', {
                text: "**ALERT COVID-19**<br><br>Too many people detected Room capacity = 4<br>",
                duration: 9
            });

            setTimeout(function() {
                xapi.config.set("Standby Signage Url", url1);
                xapi.command('Standby Halfwake');
                setTimeout(function() {
                    xapi.config.set("Standby Signage Url", theURL);
                }, 30 * 1000);
            }, 9000);
        } else if (event.WidgetId == 'bouton_air_renewal' && event.Type !== 'clicked') {
            xapi.config.set('UserInterface Features HideAll', 'True');
            xapi.command('UserInterface Message Alert Display', {
                Title: 'Please Leave the Room. The Air is Renewing',
                Text: 'Waiting time: ' + alertDuration + ' min',
                Duration: 0,
            });



            setTimeout(function() {
                var refreshIntervalId = setInterval(updateEveryMinutes, 60 * 1000);
                xapi.config.set("Standby Signage Url", "http://websrv2.ciscofrance.com:15198/airRenewal/?dc=" + alertDuration);
                xapi.command('Standby Halfwake');
                setTimeout(function() {
                    xapi.config.set("Standby Signage Url", originUrl);
                    clearInterval(refreshIntervalId)
                }, alertDuration * (60 * 1000));
            }, 4000);
        } else if (event.WidgetId == 'bouton_footprint' && event.Type !== 'clicked') {
            xapi.command('UserInterface Message Alert Display', {
                Title: 'Lauch Footprint Dashboard',
                Text: '',
                Duration: 0,
            });



            setTimeout(function() {
                xapi.status.get("Network 1").then((network) => {
                    const macAddress = network.Ethernet.MacAddress;
                    xapi.config.set("Standby Signage Url", "http://websrv2.ciscofrance.com:15124/" + macAddress);
                });
                xapi.command('Standby Halfwake');
                setTimeout(function() {
                    xapi.config.set("Standby Signage Url", theURL);
                }, 5 * (60 * 1000));
            }, 4000);
        } else if (event.WidgetId == 'bouton_standby' && event.Type !== 'clicked') {
            xapi.config.set("Standby Signage Url", theURL);
            xapi.command('Standby Halfwake');
        }
    });


});

function updateEveryMinutes() {
    alertDuration = alertDuration - 1;
    console.log("In Update");
    if (alertDuration > 0) {
        xapi.config.set("Standby Signage Url", "http://websrv2.ciscofrance.com:15198/airRenewal/?dc=" + alertDuration);
        xapi.command('Standby Halfwake');
    } else {
        xapi.command('Standby Deactivate');
        xapi.command(' Audio SoundsAndAlerts Ringtone Play', {
            RingTone: 'Ringer',
        });
        xapi.config.set('UserInterface Features HideAll', 'False');
    }
}