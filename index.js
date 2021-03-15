/**
 * v2.0
 *
 * @url https://github.com/SeydX/homebridge-washingmachine-pow
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {
  let WMPow = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-washingmachine-pow', 'WMPow', WMPow, true);
};