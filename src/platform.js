'use strict';

const Logger = require('./helper/logger.js');
const packageFile = require('../package.json');

const Telegram = require('./helper/telegram');

//Accessories
const OutletAccessory = require('./accessories/outlet.js');
const MotionAccessory = require('./accessories/motion.js');

//Custom Types
const EveTypes = require('./types/eve_types.js');

const PLUGIN_NAME = 'homebridge-washmachine-pow';
const PLATFORM_NAME = 'WMPow';

var Accessory, Service, Characteristic, UUIDGen, FakeGatoHistoryService;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return WMPow;

};

function WMPow (log, config, api) {
  
  if (!api||!config) 
    return;

  Logger.init(log, config.debug);

  EveTypes.registerWith(api.hap);
  FakeGatoHistoryService = require('fakegato-history')(api);

  this.api = api;
  this.accessories = [];
  this.config = config;
  
  this.devices = new Map();
    
  if(this.config.devices) {
  
    this.config.devices.forEach(device => {
    
      let error = false;
      
      device.type = 'outlet';
      device.port = device.port || 1883;
      device.topics = device.topics || {};
      device.parameter = device.parameter || {};
      device.onValue = device.onValue || 'ON';
      device.offValue = device.offValue || 'OFF';
      device.startValue = device.startValue || 3;
      
      device.options = {
        username: device.username || '',
        password: device.password || ''
      };

      if (!device.name) {
        Logger.warn('One of the devices has no name configured. This device will be skipped.');
        error = true;
      } else if (!device.ip) {
        Logger.warn('There is no ip configured for this device. This device will be skipped.', device.name);
        error = true;
      } else if (!device.topics.energyGet){
        Logger.warn('There is no topic for energy state ("energyGet") configured for this device. This device will be skipped.', device.name);
        error = true;
      } else if(!device.topics.stateGet){
        Logger.warn('There is no topic for device state ("stateGet") configured for this device. This device will be skipped.', device.name);
        error = true;
      } else if(!device.topics.statusGet){
        Logger.warn('There is no topic for device state ("statusGet") configured for this device. This device will be skipped.', device.name);
        error = true;
      } else if(device.topics.stateSet){
        Logger.warn('There is no topic for switching device state ("stateSet") configured for this device. This device will be skipped.', device.name);
        error = true;
      } else if(!device.topics.resetSet || (device.topics.resetSet && !device.topics.resetSet.length)){
        Logger.warn('There is no topic(s) for resetting energy state ("resetSet") configured for this device. This device will be skipped.', device.name);
        error = true;
      }

      if (!error) {
      
        const uuid = UUIDGen.generate(device.name);
      
        if (this.devices.has(uuid)) {
     
          Logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
     
        } else {
          
          if(device.motionSensor){
          
            let motionSensor = {
              name: device.name + ' Motion',
              type: 'motion'
            };
            
            const uuidMotion = UUIDGen.generate(motionSensor.name);
            
            this.devices.set(uuidMotion, motionSensor);
          
          }
          
          this.devices.set(uuid, device);
          
        }
    
      }
      
    });
    
  }
  
  if(config.telegram && config.telegram.active && config.telegram.token && config.telegram.chatID){
   
    this.config.telegram = config.telegram;
    this.config.telegram.messages = this.config.telegram.messages || {};
    
    this.messages = {
      started: this.config.telegram.messages.started || false,
      finished: this.config.telegram.messages.finished || false
    };
      
    this.Telegram = new Telegram(this.config.telegram, this.messages);  
    this.Telegram.start();
    
  } else {
 
    Logger.debug('Telegram is not or not correctly set up. Skip.');
 
  }  

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  
}

WMPow.prototype = {

  didFinishLaunching: function(){

    for (const entry of this.devices.entries()) {
    
      let uuid = entry[0];
      let device = entry[1];
      
      const cachedAccessory = this.accessories.find(curAcc => curAcc.UUID === uuid);
      
      if (!cachedAccessory) {
      
        const accessory = new Accessory(device.name, uuid);

        Logger.info('Configuring accessory...', accessory.displayName);
        this.setupAccessory(accessory, device);
        
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        
        this.accessories.push(accessory);
        
      }
      
    }

    this.accessories.forEach(accessory => {
    
      const device = this.devices.get(accessory.UUID);
      
      try {
      
        if (!device)
          this.removeAccessory(accessory);
    
      } catch(err) {

        Logger.info('It looks like the device has already been removed. Skip removing.');
        Logger.debug(err);
     
      }
      
    });
  
  },
  
  setupAccessory: async function(accessory, device){
    
    accessory.on('identify', () => {
      Logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    
    const manufacturer = device.manufacturer && device.manufacturer !== '' ? device.manufacturer : 'Homebridge';
    const model = device.model && device.model !== '' ? device.model : device.type;
    const serialNumber = device.serialNumber && device.serialNumber !== '' ? device.serialNumber : accessory.displayName;
    
    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, manufacturer);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, model);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, serialNumber);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, packageFile.version);
    }
    
    accessory.context.config = device;
    
    if(device.type === 'motion'){
      new MotionAccessory(this.api, accessory, FakeGatoHistoryService);
    } else if(device.type === 'outlet'){
      new OutletAccessory(this.api, accessory, this.accessories, FakeGatoHistoryService, this.Telegram);
    }

  },

  configureAccessory: async function(accessory){

    const device = this.devices.get(accessory.UUID);

    if (device){
      Logger.info('Configuring accessory...', accessory.displayName);                                                                                            
      this.setupAccessory(accessory, device);
    }
    
    this.accessories.push(accessory);
  
  },
  
  removeAccessory: function(accessory) {
  
    Logger.info('Removing accessory...', accessory.displayName);
    
    let accessories = this.accessories.map( cachedAccessory => {
      if(cachedAccessory.displayName !== accessory.displayName){
        return cachedAccessory;
      }
    });
    
    this.accessories = accessories.filter(function (el) {
      return el != null;
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  
  }

};