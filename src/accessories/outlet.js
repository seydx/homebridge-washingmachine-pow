'use strict';

const Logger = require('../helper/logger.js');

const MQTT = require('async-mqtt');

class OutletAccessory {

  constructor (api, accessory, accessories, FakeGatoHistoryService, telegram) {
    
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    this.FakeGatoHistoryService = FakeGatoHistoryService;
    this.Telegram = telegram;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.Outlet);
        
    if(!service){
      Logger.info('Adding Outlet service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Outlet, this.accessory.displayName, this.accessory.context.config.type);
    }
    
    if(!service.testCharacteristic(this.api.hap.Characteristic.CurrentConsumption))
      service.addCharacteristic(this.api.hap.Characteristic.CurrentConsumption);
        
    if(!service.testCharacteristic(this.api.hap.Characteristic.TotalConsumption))
      service.addCharacteristic(this.api.hap.Characteristic.TotalConsumption);
      
    if(!service.testCharacteristic(this.api.hap.Characteristic.Volts))
      service.addCharacteristic(this.api.hap.Characteristic.Volts);
      
    if(!service.testCharacteristic(this.api.hap.Characteristic.Amperes))
      service.addCharacteristic(this.api.hap.Characteristic.Amperes);
      
    if(!service.testCharacteristic(this.api.hap.Characteristic.ResetTotal))
      service.addCharacteristic(this.api.hap.Characteristic.ResetTotal);
  
    this.historyService = new this.FakeGatoHistoryService('energy', this.accessory, {storage:'fs'}); 
    
    service.getCharacteristic(this.api.hap.Characteristic.CurrentConsumption)
      .on('change', this.changedState.bind(this));
    
    service.getCharacteristic(this.api.hap.Characteristic.ResetTotal)
      .on('set', this.resetEnergy.bind(this));
  
    service.getCharacteristic(this.api.hap.Characteristic.On)
      .on('set', this.setState.bind(this));
      
    this.start();
    
  }  
  
  async start(){
  
    try {
    
      this.client = MQTT.connect('mqtt://' + this.accessory.context.config.ip + ':' + this.accessory.context.config.port, this.accessory.context.config.options);
      
      this.client.on('error', err => {
        Logger.error('An error occured with MQTT', this.accessory.displayName);
        Logger.error(err);
      });
      
      this.client.on('close', () => {
        Logger.info('MQTT closed', this.accessory.displayName);
      });
      
      this.client.on('Offline', () => {
        Logger.info('MQTT offline', this.accessory.displayName);
      });
      
      this.client.on('reconnect', () => {
        Logger.info('MQTT reconnecting...', this.accessory.displayName);
      });
      
      this.client.on('end', () => {
        Logger.info('MQTT quitted', this.accessory.displayName);
      });
      
      Logger.info('Connecting to mqtt broker', this.accessory.displayName);
      
      this.client.on('connect', async () => {     
        
        Logger.info('Connected. Subscribing to topics...', this.accessory.displayName);
        
        try {
        
          await this.client.subscribe(this.accessory.context.config.topics.energyGet);
          await this.client.subscribe(this.accessory.context.config.topics.stateGet);
          await this.client.subscribe(this.accessory.context.config.topics.statusGet);
        
        } catch(err) {
        
          Logger.error('An error occured while subscribing to topics', this.accessory.displayName);
          Logger.error(err);
        
        }
          
        Logger.info('Subscribed!', this.accessory.displayName);
        
        this.getState();
      
      });
    
    } catch(err) {
    
      Logger.error('An error occured while connecting to mqtt broker', this.accessory.displayName);
      Logger.error(err);
    
    }
  
  }
  
  async getState(){
  
    this.client.on('message', (topic, message, state) => {
  
      switch(topic){
        
        case this.accessory.context.config.topics.statusGet:
        
          Logger.debug(message.toString() + ' (statusGet)', this.accessory.displayName);
      
          message = message.toString();
          state = message === this.accessory.context.config.onValue 
            ? true 
            : false;
            
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(state);
      
          break;
        
        case this.accessory.context.config.topics.stateGet:
        
          Logger.debug(message.toString() + ' (stateGet)', this.accessory.displayName);
      
          message = JSON.parse(message);
          state = message.POWER === this.accessory.context.config.onValue 
            ? true 
            : false;
          
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(state);
      
          break;
        
        case this.accessory.context.config.topics.energyGet:
      
          Logger.debug(message.toString() + ' (energyGet)', this.accessory.displayName);
        
          message = JSON.parse(message);
          state = message.ENERGY.Power 
            ? true 
            : false;
          
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.OutletInUse)
            .updateValue(state);
          
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.CurrentConsumption)
            .updateValue(message.ENERGY.Power);
            
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.TotalConsumption)
            .updateValue(message.ENERGY.Total);
            
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.Volts)
            .updateValue(message.ENERGY.Voltage);
            
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.Amperes)
            .updateValue(message.ENERGY.Current);
      
          if(message.ENERGY.Power >= this.accessory.context.config.startValue && !this.accessory.context.started){
        
            this.accessory.context.started = true;
            
            if(this.Telegram)
              this.Telegram.send('started', this.accessory.displayName);
            
            const motionAccessory = this.accessories.find(accessory => accessory.displayName === this.accessory.displayName + ' Motion');
            
            if(motionAccessory) {
            
              motionAccessory
                .getService(this.api.hap.Service.MotionSensor)
                .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
                .updateValue(1);
            
            } else {
            
              Logger.info('Started', this.accessory.displayName);
              
            }
            
          } else if(message.ENERGY.Power < this.accessory.context.config.startValue && this.accessory.context.started){
        
            this.accessory.context.started = false;
            
            if(this.Telegram)
              this.Telegram.send('finished', this.accessory.displayName);
            
            const motionAccessory = this.accessories.find(accessory => accessory.displayName === this.accessory.displayName + ' Motion');
            
            if(motionAccessory) {
            
              motionAccessory
                .getService(this.api.hap.Service.MotionSensor)
                .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
                .updateValue(0);
            
            } else {
            
              Logger.info('Finished', this.accessory.displayName);
            
            }
        
          }
      
          break;
        
        default:
          //fall throug
          break;

      }
      
    });
  
  }
  
  async setState(state, callback){
  
    let cmd = state
      ? 'on'
      : 'off';
  
    try {
    
      if(this.client){
        
        Logger.debug('Send cmd (' + this.accessory.context.config.topics.statusSet + ') => ' + cmd, this.accessory.displayName);
      
        await this.client.publish(this.accessory.context.config.topics.statusSet, cmd);
      
      } else {
      
        Logger.warn('Not connected to mqtt broker!', this.accessory.displayName);
        
        setTimeout(() => {
        
          this.accessory
            .getService(this.api.hap.Service.Outlet)
            .getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(state ? false : true);
        
        }, 1000);
      
      }
    
    } catch(err) {
    
      Logger.error('An error occured during setting state to ' + cmd, this.accessory.displayName);
      Logger.error(err);
    
    }
    
    callback(null);
  
  }
  
  async resetEnergy(state, callback){
  
    try {
    
      Logger.info('Resetting power meter...', this.accessory.displayName);
      
      const now = Math.round(new Date().valueOf() / 1000); 
      const epoch = Math.round(new Date('2001-01-01T00:00:00Z').valueOf() / 1000);
      
      for(const topic of this.accessory.context.config.topics.resetSet){
        Logger.debug('Send cmd (' + topic + ') => 0', this.accessory.displayName);
        await this.client.publish(topic, '0');
      }
      
      this.accessory
        .getService(this.api.hap.Service.Outlet)
        .getCharacteristic(this.api.hap.Characteristic.ResetTotal)
        .updateValue(now - epoch);
        
      this.accessory
        .getService(this.api.hap.Service.Outlet)
        .getCharacteristic(this.api.hap.Characteristic.TotalConsumption)
        .updateValue(0);
    
    } catch(err) {
    
      Logger.error('An error occured while resetting power meter', this.accessory.displayName);
      Logger.error(err);
    
    }
    
    callback(null);
  
  }
  
  async changedState(value){
  
    if(value.oldValue !== value.newValue){
      
      Logger.debug('Current consumption changed from ' + value.oldValue + 'W to ' + value.newValue + 'W', this.accessory.displayName);
    
      this.historyService.addEntry({time: Math.round(new Date().valueOf() / 1000), power: value.newValue});
    
    }
  
  }               

}

module.exports = OutletAccessory;
