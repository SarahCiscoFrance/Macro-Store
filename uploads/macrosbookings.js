import xapi from 'xapi';

xapi.status.on('RoomAnalytics PeopleCount Current', (numberofpeople) => askPerson(numberofpeople));

let asked = false;
var meetinglength = 15; // in minutes
var startTime;

function askPerson(numberofpeople){
  console.log(numberofpeople)
  if(numberofpeople >= 1 && !asked){
    asked = true;
     xapi.command("UserInterface Message Prompt Display", {
          Text: 'Choose a reservation period',
          FeedbackId: 'book',
          'Option.1': '15 min.',
          'Option.2': '30 min.',
          'Option.3': '1 hour',
        }).catch((error) => { console.error(error); });
  }
  else if (numberofpeople < 1){
    asked = false
  }
}


xapi.event.on('UserInterface Message Prompt Response', (event) => {
  switch(event.FeedbackId){
    case 'book':
      switch(event.OptionId){
        case '1':
          //console.log(15)
          booking_add(15);
          break;
        case '2':
          //console.log(30)
          booking_add(30);
          break;
        case '3':
          //console.log(60)
          booking_add(60);
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
});



function booking_add(length) {
  meetinglength = length;
  var bookings = [];
  
  xapi.command("Bookings List").then((bookings) => {
    if (bookings.ResultInfo.TotalRows <= 0) {
      startTime = new Date();
      startTime = getCiscoDeviceDateFormatFromJSDate(startTime);
      //var endtime = new Date();
      //endtime.setMinutes(endtime.getMinutes() + meetinglength);
      //endtime = getCiscoDeviceDateFormatFromJSDate(endtime);
      
      createBooking("Test", "rudferna@cisco.com", startTime, 5);
      
      //var myBookings = '<Bookings item="1" status="OK">' + getBookingsListXML() + '</Bookings>' ;
      
      

    } else {
      showMsg("Information", "Room Already Book.");
    }
  })
}

function createBooking(bookingTitle, uriToCall, startTime, duration){
  console.log(bookingTitle, uriToCall, startTime, duration)
  xapi.command('Bookings Put', {},`{
    "Bookings": [
    {
    "Id": "6",
    "Number": `+uriToCall +`,
    "Organizer": {
    "Name": "John Doe"
    },
    "Protocol": "SIP",
    "Time": {
    "Duration": 1,
    "EndTimeBuffer": 50,
    "StartTime": `+startTime +`
    },
    "Title": `+bookingTitle +`
    }
    ]
   }`);
}


function showMsg(title, msg) {
  xapi.command("UserInterface Message Alert Display", {
    Title: title,
    Text: msg,
    Duration: 10
  });
}

function getCiscoDeviceDateFormatFromJSDate(jsdate){
  return jsdate.toISOString(jsdate).split('.')[0]+"Z";
}