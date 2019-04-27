'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');

//Accessory
const Outlet = require('./accessories/outlet.js');
const Sensor = require('./accessories/sensor.js');

const pluginName = 'homebridge-washmachine-pow';
const platformName = 'WMPow';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return WMPow;
};

function WMPow (log, config, api) {
  if (!api || !config) return;

  // HB
  this.log = log;
  this.logger = new LogUtil(null, log);
  this.accessories = [];
  this.config = config;
  
  this._accessories = new Map();
  
  this.config.devices = this.config.devices||[];
  this.count = 0;
  
  this.config.notifier = {
    active: this.config.notifier.active||false,
    token: this.config.notifier.token, 
    chatID: this.config.notifier.chatID,
    motionOn: this.config.notifier.motionOn||'*Washingmachine* startet!',
    motionOff: this.config.notifier.motionOff||'*Washingmachine* finished!'
  };
  
  if (api) {
  
    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }
    
    this.log('**************************************************************');
    this.log('WMPow v'+packageFile.version+' by SeydX');
    this.log('GitHub: https://github.com/SeydX/homebridge-washmachine-pow');
    this.log('Email: seyd55@outlook.de');
    this.log('**************************************************************');
    this.log('start success...');
    
    this.api = api;
      
    this.api.on('didFinishLaunching', this._initPlatform.bind(this));
  }
}

WMPow.prototype = {

  _initPlatform: function(){
  
    if(!this.accessories.length){
  
      if(!this.config.clearCache){
      
        for(const device of this.config.devices){
    
          if(device.active){
    
            this._addOrConfigure(null, device, 'Outlet', true);
            this._addOrConfigure(null, device, 'Sensor', true);  
    
          }
        
        }
      
      }
    
    } else {
    
      if(this.config.clearCache){
      
        this.accessories.map( accessory => this.removeAccessory(accessory) );
      
      } else {  
      
        for(const device of this.config.devices){
   
          if(!device.active && (this._accessories.get(device.name + ' Outlet')||this._accessories.get(device.name + ' Sensor'))){
   
            this.accessories.map( accessory => {

              if(device.name + ' Outlet' === accessory.displayName||device.name + ' Sensor' === accessory.displayName)
                this.removeAccessory(accessory);
    
            });
    
          }
        
        }
      
      }
    
    }
  
  },
  
  _addOrConfigure: async function(accessory, object, type, add){

    const self = this;
    
    this.count++;
    
    if(add){

      let name = type === 'Outlet' ? object.name + ' Outlet' : object.name + ' Sensor';
      
      let uuid = UUIDGen.generate(name);
      let accessoryType = type === 'Outlet' ? 7 : 10;
      let accessoryService = type === 'Outlet' ? Service.Outlet : Service.MotionSensor;
      
      accessory = new Accessory(name, uuid, accessoryType);
      accessory.addService(accessoryService, name, type);
      
      accessory.context = {};

    } else {
    
      this.logger.info('Configuring accessory ' + accessory.displayName);

    }  

    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, accessory.displayName)
      .setCharacteristic(Characteristic.Identify, accessory.displayName)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, type)
      .setCharacteristic(Characteristic.SerialNumber, 'POW-' + this.count)
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
    
    await this.refreshContext(accessory, object, type, add);

    if(add){
    
      this.logger.info('Registering platform accessory: ' + accessory.displayName);
        
      this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
      this.accessories.push(accessory);
    
    }
    
    accessory.on('identify', function (paired, callback) {
      self.logger.info(accessory.displayName + ': Hi!');
      callback();
    });
    
    if(accessory.context.active)
      if(type === 'Outlet'){
        new Outlet(this, accessory);
      } else {
        new Sensor(this, accessory);
      }

  },
  
  refreshContext: function(accessory, object, type, add){
  
    accessory.reachable = true;
    accessory.context.notifier = this.config.notifier;
    
    accessory.context.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);    

    accessory.context.options = {
      keepalive: 10,
      clientId: accessory.context.client_Id,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
        topic: 'WillMsg',
        payload: 'Connection Closed abnormally..!',
        qos: 0,
        retain: false
      },
      rejectUnauthorized: false
    };
    
    if(add){
    
      accessory.context.active = object.active||false;
      accessory.context.address = object.address;
      accessory.context.port = object.port||1883;
      accessory.context.options.username = object.username||'';
      accessory.context.options.password = object.password||'';
      accessory.context.publishTopic = object.publishTopic;
      accessory.context.publishParam = object.publishParam;
      accessory.context.subscribeTopics = object.subscribeTopics||{};
      accessory.context.sendTopics = object.sendTopics||{};
      accessory.context.parameter = object.parameter||{off: '0', standby: '2', pause: '3', active: '5'};
    
    } else {
    
      for(const device of this.config.devices){

        if(device.name + ' Outlet' === accessory.displayName || device.name + ' Sensor' === accessory.displayName){
      
          accessory.context.active = device.active||false;
          accessory.context.address = device.address;
          accessory.context.port = device.port||1883; 
          accessory.context.options.username = device.username||'';
          accessory.context.options.password = device.password||'';
          accessory.context.publishTopic = device.publishTopic;
          accessory.context.publishParam = device.publishParam;
          accessory.context.subscribeTopics = device.subscribeTopics||{};
          accessory.context.sendTopics = device.sendTopics||{};
          accessory.context.parameter = device.parameter||{off: 0, standby: 2, pause: 3, active: 5};
     
        }
    
      }
    
    }
    
    return;
    
  },

  configureAccessory: function(accessory){

    this.accessories.push(accessory);
    this._accessories.set(accessory.displayName, accessory);
    
    let type = accessory.category === 7 ? 'Outlet' : 'Sensor';
    
    if(!this.config.clearCache)
      this._addOrConfigure(accessory, null, type, false);
  
  },

  removeAccessory: function (accessory) {
    if (accessory) {

      this.logger.warn('Removing accessory: ' + accessory.displayName + '. No longer configured.');
      
      for(const i in this.accessories){
        if(this.accessories[i].displayName === accessory.displayName){
          this.accessories[i].context.removed = true;
        }
      }

      let newAccessories = this.accessories.map( acc => {
        if(acc.displayName !== accessory.displayName){
          return acc;
        }
      });

      let filteredAccessories = newAccessories.filter(function (el) {
        return el != null;
      });

      this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]); 

      this.accessories = filteredAccessories;

    }
  }

};
