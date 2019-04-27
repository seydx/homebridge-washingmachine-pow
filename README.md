<p align="center">
    <img src="https://i.imgur.com/mYrmIl9.png" height="200">
</p>


# Washingmachine!Pow v1

[![npm](https://img.shields.io/npm/v/homebridge-washingmachine-pow.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-washingmachine-pow)
[![npm](https://img.shields.io/npm/dt/homebridge-washingmachine-pow.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-washingmachine-pow)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-washingmachine-pow.svg?style=flat-square)](https://github.com/SeydX/homebridge-washingmachine-pow)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

<img src="https://i.imgur.com/THZg6kb.gif" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a dynamic platform plugin for [Homebridge](https://github.com/nfarina/homebridge) to control the state of your **washingmachine(s)** used with Sonoff POW (R2) with Telegram notification Support

This Plugin creates two Accessories. A Outlet Accessory with FakeGato functionality to check the power etc and a Motion Sensor Accessory, also with FakeGato functionality, which will be triggered when the current power is greater or equal the "pause" value defined in config.json

You can also set up the notifier to get a Telegram notification with customized messages and markdown capability when the current running program finishes!

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```(sudo) npm i -g homebridge-washingmachine-pow@latest```


## Basic configuration

 ```
{
  "bridge": {
    ...
  },
  "accessories": [
    ...
  ],
  "platforms": [
    {
      "platform": "WMPow",
      "clearCache": false,
      "devices": [
        {
          "active": true,
          "name": "Bathroom Washingmachine",
          "address": "192.168.178.134",
          "port": 1883,
          "username": "test",
          "password": "strong1234",
          "publishTopic": "cmnd/sonoffpow/TelePeriod",
          "puplishParam": "15",
          "subscribeTopics": {
            "getPower": "stat/sonoffpow/POWER",
            "getEnergy": "tele/sonoffpow/SENSOR",
            "getState": "tele/sonoffpow/STATE",
            "getLink": "tele/sonoffpow/LWT"
          },
          "sendTopics": {
            "setPower": "cmnd/sonoffpow/power"
          },
          "parameter": {
            "off": 0,
            "standby": 2,
            "pause": 3,
            "active": 5
          }
        }
      ],
      "notifier": {
        "active": true,
        "token": "TelegramToken",
        "chatID": "TelegramChatID",
        "motionOn": "*Washingmachine:* started!",
        "motionOff": "*Washingmachine:* finished!"
      }
    }
  ]
}
 ```
 See [Example Config](https://github.com/SeydX/homebridge-washingmachine-pow/blob/master/example-config.json) for more details.

 
 ## Options

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| platform | **Yes** | Must be **WMPow** |
| platform.devices | **No** | An array of devices _(Default: [])_ |
| platform.devices.active | **No** | Activate/Deactivate the accessory |
| platform.devices.name | **Yes** | Name of the device/accessory (Must be unique!) |
| platform.devices.address | **Yes** | Address of your MQTT Service |
| platform.devices.port | **No** | Port of your MQTT Service _(Default: 1883)_ |
| platform.devices.username | **No** | Username for the MQTT Service (If no username setted up, just leave blank) |
| platform.devices.password | **No** | Password for the MQTT Service (If no password setted up, just leave blank) |
| platform.devices.parameter | **Yes** | Parameter for triggering the motion sensor |
| platform.devices.parameter.off | **Yes** | Current Power Consumption when  device is off |
| platform.devices.parameter.standby | **Yes** | Current Power Consumption when  device is in standby mode |
| platform.devices.parameter.pause | **Yes** | Current Power Consumption when  device is paused |
| platform.devices.parameter.active | **Yes** | Current Power Consumption when  device is active |
| notifier.active | **No** | Activate/Deactivate notifier _(Default: false)_ |
| notifier.token | **No** | Telegram Bot Token |
| notifier.chatID | **No** | Telegram Chat ID |
| notifier.motionOn | **No** | Own message when motion sensor triggers on (if you dont want to get this notification, just remove from config) |
| notifier.motionOff | **No** | Own message when motion sensor triggers off (if you dont want to get this notification, just remove from config) |


## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2 and iOS 12.3 Beta:

* iOS 12.2 / iOS 12.3 Beta
* Apple Home
* All 3rd party apps like Elgato Eve etc. _(recommended)_
* Homebridge v0.4.49


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-washingmachine-pow/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-washingmachine-pow/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues.

***HomeBridge with debug mode:*** ```DEBUG=WMPow``` and/or ```homebridge -D ```
