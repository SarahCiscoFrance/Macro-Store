/**
 * Topic: Send Room Analytics data to the application PeoplePresence
 * Author: rudferna@cisco.com
 * Team: collaboration FRANCE
 * Version: 1.4
 * Date: 09/06/2022
 */

const xapi = require('xapi');

xapi.config.set("HttpClient Mode", "On");
xapi.config.set("HttpClient AllowHTTP", "True");
xapi.config.set("HttpClient AllowInsecureHTTPS", "True");
xapi.config.set("RoomAnalytics PeopleCountOutOfCall", "On");
xapi.config.set("RoomAnalytics PeoplePresenceDetector", "On");
xapi.config.set("RoomAnalytics AmbientNoiseEstimation Mode", "On");
xapi.config.set("Standby WakeupOnMotionDetection", "On");

const urlServerPeoplePresence = `http://10.1.20.24:15133/codec/room-analytics`;

function getNavigators(devices) {
  return new Promise(resolve => {
    var data = devices.filter(device => device.Name.toLowerCase().includes("navigator"));
    resolve(data);
  });
}

function isCurrentDateInterval(startDate, endDate) {
  var now = new Date();
  var start = new Date(startDate);
  var end = new Date(endDate);
  return (now >= start  && end > now);
}


xapi.status.on("RoomAnalytics", (roomAnalytics) => {
  let data = {
    "Status": {
      "Identification": {
        "MACAddress": {

        },
        "ProductID": {

        }
      },
      "RoomAnalytics": roomAnalytics,
      "PeripheralsRoomAnalytics": {},
      "Bookings": []
    }
  };

  xapi.status.get("Network 1 Ethernet MacAddress").then((macAddress) => {
    data.Status.Identification.MACAddress.Value = macAddress;

    xapi.status.get("SystemUnit ProductId").then((productId) => {
      data.Status.Identification.ProductID.Value = productId;

      xapi.Command.Bookings.List({
        DayOffset: 0
      }).then(bookings => {
        if(bookings.Booking != undefined){
        //var valide_bookings = bookings.Booking.filter(b => !isDatePast(b.Time.EndTime));
        var valide_bookings = bookings.Booking.filter(b => isCurrentDateInterval(b.Time.StartTime, b.Time.EndTime));
       valide_bookings.forEach(element => {
         var endTime = new Date(element.Time.EndTime);
          data.Status.Bookings.push({
            startTime: element.Time.StartTime,
            endTime: (endTime.getHours()<10? "0"+endTime.getHours():endTime.getHours()) + ":" + (endTime.getMinutes()<10? "0"+endTime.getMinutes():endTime.getMinutes()),
            organizer: element.Organizer.FirstName
          });
        });
        }
        console.log(data.Status.Bookings);
        xapi.Status.Peripherals.ConnectedDevice.get().then(async devices => {
          getNavigators(devices).then(navigators => {
            data.Status.PeripheralsRoomAnalytics = navigators;
            xapi.command('HttpClient Post', {
                Header: ["Content-Type: application/json"],
                AllowInsecureHTTPS: true,
                Url: urlServerPeoplePresence
              }, JSON.stringify(data))
              .catch((err) => {
                console.log(err);
              });
          });
        });
      });
    });
  });
});