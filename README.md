<p align="center">
    <img src="https://i.imgur.com/mYrmIl9.png" height="200">
</p>


# homebridge-washingmachine-pow

[![npm](https://img.shields.io/npm/v/homebridge-washingmachine-pow.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-washingmachine-pow)
[![npm](https://img.shields.io/npm/dt/homebridge-washingmachine-pow.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-washingmachine-pow)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-washingmachine-pow.svg?style=flat-square)](https://github.com/SeydX/homebridge-washingmachine-pow)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.

## Info

<img src="https://i.imgur.com/THZg6kb.gif" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a dynamic platform plugin for [Homebridge](https://github.com/nfarina/homebridge) to control the state of your **washingmachine(s)** used with Sonoff POW (R2) with Telegram notification Support

This Plugin creates a Outlet Accessory with FakeGato functionality to check the power, which will be triggered when the current power is greater or equal than "startValue" defined in config.json

You can also set up the notifier to get a Telegram notification with customized messages and markdown capability when the current running program starts and/or finishes!

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```sudo npm i -g homebridge-washingmachine-pow@latest```


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
      "debug": true,
      "devices":[
        {
          "name": "Washingmachine",
          "ip": "192.168.178.134",
          "port": 1883,
          "username": "test",
          "password": "test",
          "manufacturer": "ITEAD",
          "model": "Sonoff Pow",
          "serialNumber": "12345",
          "topics": {
            "energyGet": "tele/sonoffpow/SENSOR",
            "stateGet": "tele/sonoffpow/STATE",
            "statusGet": "stat/sonoffpow/POWER",
            "statusSet": "cmnd/sonoffpow/power",
            "resetSet": [
              "cmnd/sonoffpow/EnergyReset1",
              "cmnd/sonoffpow/EnergyReset2",
              "cmnd/sonoffpow/EnergyReset3"
            ]
          },
          "onValue": "ON",
          "offValue": "OFF",
          "startValue": 3
        }
      ],
      "telegram":{
        "active": true,
        "token": "TelegramToken",
        "chatID": "TelegramChatID",
        "messages": {
          "started": "*Washingmachine:* started!",
          "finished": "*Washingmachine:* finished!"
        }
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
| debug | **No** | 	Enables additional output in the log. |
| devices.name | **Yes** | Name of the device/accessory (Must be unique!) |
| devices.ip | **Yes** | Address of your MQTT broker |
| devices.port | **No** | Port of your MQTT Service _(Default: 1883)_ |
| devices.username | **No** | Username for the MQTT Service (If no username setted up, just leave blank) |
| devices.password | **No** | Password for the MQTT Service (If no password setted up, just leave blank) |
| devices.manufacturer | **No** | Manufacturer name for display in the Home app. |
| devices.model | **No** | Model name for display in the Home app. |
| devices.serialNumber | **No** | Serialnumber for display in the Home app. |
| topics.energyGet | **Yes** | Topic for energy telemetry information. |
| topics.stateGet | **Yes** | Topic for cyclic telemetry information. |
| topics.statusGet | **Yes** | Status of switch. |
| topics.statusSet | **Yes** | Command topic to set switch. |
| topics.resetSet | **Yes** | Command topic(s) to reset energy information. |
| devices.onValue | **No** | Client ON message for switch. |
| devices.offValue | **No** | Client OFF message for switch. |
| devices.startValue | **No** | Current Power Consumption when  device is active |
| telegram.active | **No** | Activate/Deactivate notifier _(Default: false)_ |
| telegram.token | **No** | Telegram Bot Token |
| telegram.chatID | **No** | Telegram Chat ID |
| telegram.messages.started | **No** | Own message when motion sensor triggers on (if you dont want to get this notification, just remove from config) |
| telegram.messages.finished | **No** | Own message when motion sensor triggers off (if you dont want to get this notification, just remove from config) |


## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2 and iOS 12.3 Beta:

* iOS 14+
* Apple Home
* All 3rd party apps like Elgato Eve etc.
* Homebridge v1.1.6+


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-washingmachine-pow/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-washingmachine-pow/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just enable ``debug`` in your config and restart homebridge.
