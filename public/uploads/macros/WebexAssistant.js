/**
 * Topic: Show metrics of the room using Webex Assistant Skill
 * Author: rudferna@cisco.com
 * Team: collaboration FRANCE
 * Version: 1.1
 * Date: 09/06/2022
 */

/**
 * /!\ WARNING /!\
 * You also need to install the PeoplePresence macro
 * so that the "Metrics Dashboard" application on websrv2 receives
 * the environmental metrics from this device.
 */

import xapi from 'xapi';

xapi.Config.WebEngine.Mode.set('On')

let touchPanelIDNumber = null
let touchPanelFound = false

// Environmentale metrics
let peopleCount = null
let peoplePresence = null
let temperature = null
let humidity = null
let airQuality = null
let ambiantNoise = null
let soundLevel = null

async function setTouchPanelID() {
  try {
    const devices = await xapi.Status.Peripherals.ConnectedDevice.get();
    const result = devices.find((d) => d.Type === "TouchPanel" || d.Name === "Cisco Webex Room Navigator");
    touchPanelIDNumber = result.id;
    if (touchPanelIDNumber != 0) {
      touchPanelFound = true;
    }
    console.log("Touch Panel Found: ID = " + result.id);
  } catch (error) {

  }
}

async function checkIfDeskProOrNavigator() {
  try {
    const device = await xapi.Status.Peripherals.ConnectedDevice.get();
    if (device === "Cisco Webex Desk Pro") {
      console.log("Desk Pro Found");
    } else {
      await setTouchPanelID();
    }
  } catch (error) {

  }
}

async function setMetrics(){

  peopleCount = await xapi.Status.RoomAnalytics.PeopleCount.Current.get().catch(err => console.log(err));
  peoplePresence = await xapi.Status.RoomAnalytics.PeoplePresence.get().catch(err => console.log(err));
  
  if(touchPanelFound){
    const devices = await xapi.Status.Peripherals.ConnectedDevice.get().catch(err => console.log(err));
    temperature = devices.find((d) => d.id === touchPanelIDNumber).RoomAnalytics.AmbientTemperature;
    airQuality = devices.find((d) => d.id === touchPanelIDNumber).RoomAnalytics.AirQuality.Index; 
    humidity = devices.find((d) => d.id === touchPanelIDNumber).RoomAnalytics.RelativeHumidity;
  }
  else{
    temperature = await xapi.Status.RoomAnalytics.AmbientTemperature.get().catch(err => console.log(err));
    humidity = await xapi.Status.RoomAnalytics.RelativeHumidity.get().catch(err => console.log(err));
  }
 
  ambiantNoise = await xapi.Status.RoomAnalytics.AmbientNoise.Level.A.get().catch(err => console.log(err))
  soundLevel = await xapi.Status.RoomAnalytics.Sound.Level.A.get().catch(err => console.log(err))
}

function generateMessage(){
  return `**Rapport de la salle**<br><br>Personne: ${peopleCount >= 0 ? peopleCount : 0}<br>Temperature: ${temperature}°C<br>Humidity: ${humidity}%<br>Qualité de l'air: ${airQuality}%<br>Bruit ambiant: ${ambiantNoise} dbA`
}

xapi.Event.UserInterface.Assistant.Notification.on(async (event) => {
  console.log(event)
  const { Name } =  event;
  if(Name === "Report"){
    displayMetrics()
  }
  else if(Name === "Room_Metric"){
    console.log('inside')
    const mac = await xapi.Status.Network[1].Ethernet.MacAddress.get()
    xapi.Command.UserInterface.WebView.Display(
    { Title: 'Données Environnmentales de la Salle', Url: `http://websrv2.ciscofrance.com:15152/${mac}` });
  }
});

function displayMetrics(){
  checkIfDeskProOrNavigator().then(async e => {
    await setMetrics()
      xapi.command('UserInterface Message TextLine Display', {
      text: generateMessage(),
      duration: 10
    });
  });
}