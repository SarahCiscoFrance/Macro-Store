const dedent = require('dedent')

module.exports = {

    setVolume: function(level) {
        return dedent(`
        set volume output volume ${level}
        `)
    },

    setBluetooth: function name(mode) {
        return dedent(`
        tell application "System Preferences"
            reveal pane "com.apple.preferences.Bluetooth"
        end tell
        tell application "System Events" to tell process "System Preferences"
            repeat until exists window "Bluetooth"
            end repeat
            try
                click button "${mode} Bluetooth" of window "Bluetooth"
            end try
        end tell
        tell application "System Preferences" to quit
        `)
    },

    setBackground: function (path) {
        return dedent(`
        tell application "Finder"
            try
               set desktop picture to POSIX file "${path}"
            end try
        end tell
        `)
    },

    closeApps: function() {
        return dedent(`
        tell application "System Events"
            set allApps to displayed name of (every process whose background only is false) as list
        end tell
   
        set exclusions to {"Terminal", "Code"}
   
        repeat with thisApp in allApps
            set thisApp to thisApp as text
            if thisApp is not in exclusions then
                tell application thisApp to if it is running then quit
            end if
        end repeat
        `)
    },

    startApps: function (apps) {
        let content = '';
        apps.forEach(app => {
            content +=
            `tell application "${app}" to activate
            delay 1\n`
        });
        return dedent(content)
    },

    generateScript: function(volumeLevel, bluetooth, closeApps, appsToStart, desktopBackground) {
        let applescriptContent = '';

        if (volumeLevel >= 0 && volumeLevel <= 100) {
            applescriptContent += this.setVolume(volumeLevel)
            applescriptContent += `\n\n`
        } else {
            throw new Error("volumeLevel should be a number between 0 and 100 %")
        }
    

        if (closeApps) {
            applescriptContent += this.closeApps()
            applescriptContent += `\n\n`
        }
    

        applescriptContent += this.setBluetooth(bluetooth ? 'Activer' : 'Désactiver')
        applescriptContent += `\n\n`
    
        if (appsToStart) {
            applescriptContent += 'delay 5\n'
            applescriptContent += this.startApps(appsToStart)
            applescriptContent += `\n`
        }

        applescriptContent += ApplescriptAction.setBackground(`${desktopBackground}`)

        return applescriptContent
    }

}