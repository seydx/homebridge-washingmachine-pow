/**
 * v1.0
 *
 * @url https://github.com/SeydX/homebridge-washmachine-pow
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {
  let WMPow = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-washmachine-pow', 'WMPow', WMPow, true);
};