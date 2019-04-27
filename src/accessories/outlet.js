'use strict';

const debug = require('debug')('WMPow');
const MQTT = require('async-mqtt');
const moment = require('moment');

const EveTypes = require('../types/eve.js');

var Service, Characteristic, FakeGatoHistoryService;

class sensor_Accessory {
  constructor (platform, accessory) {

    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    
    EveTypes.registerWith(platform.api.hap);
    FakeGatoHistoryService = require('fakegato-history')(platform.api);

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    this.HBpath = platform.api.user.storagePath()+'/accessories';
    
    this.accessory = accessory;
    this.mainService = this.accessory.getService(Service.Outlet, this.accessory.displayName + ' Outlet');

    this.handleMQTT();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  
  handleMQTT(){
  
    const self = this;

    this.client = MQTT.connect('mqtt://' + this.accessory.context.address + ':' + this.accessory.context.port, this.accessory.context.options);
    
    this.client.on('error', err => {
    
      self.logger.error(this.accessory.displayName.split(' Outlet')[0] + ': Error event on MQTT');
      debug(err);
    
    });
    
    this.client.on('close', () => {
    
      self.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Disconnected');
    
    });
    
    this.client.on('Offline', () => {
    
      self.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Offline');
    
    });
    
    this.client.on('reconnect', () => {
    
      self.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Reconnecting...');
    
    });
    
    this.client.on('end', () => {
    
      self.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': MQTT closed!');
    
    });
    
    process.on('SIGTERM', async () => {
    
      this.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Got SIGTERM. Closing MQTT');
      await this.client.end();
    
    });
    
    this.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Connecting..');
    this.client.on('connect', this.connectMQTT.bind(this));

  }
  
  async connectMQTT(){

    this.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Connected!');

    try {
    
      await this.client.publish(this.accessory.context.publishTopic, this.accessory.context.publishParam);        
        
      this.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Subscribing to topics...');
        
      await this.client.subscribe(this.accessory.context.subscribeTopics.getPower);
      await this.client.subscribe(this.accessory.context.subscribeTopics.getEnergy);
      await this.client.subscribe(this.accessory.context.subscribeTopics.getState);
      await this.client.subscribe(this.accessory.context.subscribeTopics.getLink);
        
      this.logger.info(this.accessory.displayName.split(' Outlet')[0] + ': Subscribed!');
      
      this.getService();
        
    } catch(err) {

      this.logger.error(this.accessory.displayName.split(' Outlet')[0] + ': An error occured on connecting/subscribing to MQTT!');
      debug(err);

    }
  
  }

  getService() {
  
    const self = this;

    this.mainService.getCharacteristic(Characteristic.On)
      .on('set', this.setState.bind(this));
      
    if(!this.mainService.testCharacteristic(Characteristic.PowerConsumption))
      this.mainService.addCharacteristic(Characteristic.PowerConsumption);
      
    if(!this.mainService.testCharacteristic(Characteristic.PowerConsumptionVA))
      this.mainService.addCharacteristic(Characteristic.PowerConsumptionVA);
      
    if(!this.mainService.testCharacteristic(Characteristic.TotalPowerConsumption))
      this.mainService.addCharacteristic(Characteristic.TotalPowerConsumption);
      
    if(!this.mainService.testCharacteristic(Characteristic.TotalPowerConsumptionVA))
      this.mainService.addCharacteristic(Characteristic.TotalPowerConsumptionVA);
      
    if(!this.mainService.testCharacteristic(Characteristic.Volts))
      this.mainService.addCharacteristic(Characteristic.Volts);
      
    if(!this.mainService.testCharacteristic(Characteristic.Amperes))
      this.mainService.addCharacteristic(Characteristic.Amperes);
      
    if(!this.mainService.testCharacteristic(Characteristic.ResetTotal))
      this.mainService.addCharacteristic(Characteristic.ResetTotal);
    
    this.mainService.getCharacteristic(Characteristic.ResetTotal)
      .on('set', this.resetPower.bind(this));
      
    this.historyService = new FakeGatoHistoryService('energy', this.accessory, {storage:'fs',path:this.HBpath, disableTimer: false, disableRepeatLastData:false});
    this.historyService.log = this.log;
    
    setTimeout(function(){
      
      if(self.historyService.history.length === 1){
      
        let state = self.mainService.getCharacteristic(Characteristic.TotalPowerConsumption).value;
        let status = state ? state : 0;
      
        self.historyService.addEntry({time: moment().unix(), power: status});
      
      }
      
      self.handleMessages();
      
    }, 5000);

  }
  
  async handleMessages(){
  
    const self = this;

    if(this.accessory.context.removed){
    
      this.logger.warn(this.accessory.displayName.split(' Outlet')[0] + ': Accessory removed! Closing MQTT');
      await this.client.end();

    } else{
    
      this.client.on('message', (topic, message, state) => {
    
        switch(topic){

          case self.accessory.context.subscribeTopics.getLink:
        
            message = message.toString();
          
            if(message !== 'Online' && !this.warned){
              debug(this.accessory.displayName.split(' Outlet')[0] + ': Link Offline!');
              this.warned = true;
            } else {
              if(this.warned){
                debug(this.accessory.displayName.split(' Outlet')[0] + ': Link established!');
                this.warned = false;
              }
            }
        
            break;
          
          case self.accessory.context.subscribeTopics.getPower:
        
            message = message.toString();
          
            state = message === 'ON' ? true : false;
          
            this.mainService.getCharacteristic(Characteristic.On)
              .updateValue(state);
        
            break;
          
          case self.accessory.context.subscribeTopics.getState:
        
            message = JSON.parse(message);
            
            state = message.POWER === 'ON' ? true : false;
            
            this.mainService.getCharacteristic(Characteristic.On)
              .updateValue(state);
        
            break;
          
          case self.accessory.context.subscribeTopics.getEnergy:
        
            message = JSON.parse(message);
            
            this.powerConsumption = parseFloat(message.ENERGY.Power);
            this.powerFactor = parseFloat(message.ENERGY.Factor);
            this.powerConsumptionVA = this.powerFactor > 0 ? this.powerConsumption / this.powerFactor : 0;
            this.totalConsumption = parseFloat(message.ENERGY.Total);
            this.voltage = parseFloat(message.ENERGY.Voltage);
            this.ameperes = parseFloat(message.ENERGY.Current);
            
            this.mainService.getCharacteristic(Characteristic.PowerConsumption)
              .updateValue(this.powerConsumption);
              
            this.mainService.getCharacteristic(Characteristic.PowerConsumptionVA)
              .updateValue(this.powerConsumptionVA);
              
            this.mainService.getCharacteristic(Characteristic.TotalPowerConsumption)
              .updateValue(this.totalConsumption);
              
            this.mainService.getCharacteristic(Characteristic.Volts)
              .updateValue(this.voltage);
              
            this.mainService.getCharacteristic(Characteristic.Amperes)
              .updateValue(this.ameperes);
              
            this.historyService.addEntry({time: moment().unix(), power: this.totalConsumption});
          
            state = message.ENERGY.Power ? true : false;
            
            this.mainService.getCharacteristic(Characteristic.OutletInUse)
              .updateValue(state);
            
            this.accessories.map( accessory => {
              
              if(accessory.displayName === this.accessory.displayName.split(' Outlet')[0] + ' Sensor'){
            
                let motionState = (message.ENERGY.Power >= this.accessory.context.parameter.pause) ? true : false;
        
                accessory.getService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected)
                  .updateValue(motionState);
        
              }
              
            });
        
            break;
          
          default:
          //

        }
        
      });

    }

  }
  
  async setState(state, callback){

    try {

      if(this.accessory.context.sendTopics.setPower){
      
        this.logger.info(this.accessory.displayName + ': ' + (state ? 'On' : 'Off'));

        await this.client.publish(this.accessory.context.sendTopics.setPower, state ? 'ON' : 'OFF');

      } else {
      
        this.logger.warn(this.accessory.displayName + ': Ignoring set event. No \'sendTopic (setPower)\' defined!');
      
      }

    } catch(err) {

      this.logger.error(this.accessory.displayName + ': An error occured while setting new state!');
      debug(err);

    } finally {

      callback();

    }
  
  }
  
  async resetPower(value, callback){

    try {
      
      this.logger.info(this.accessory.displayName + ': Resetting Power Consumption!');
      
      //EnergyReset1 0 Today
      //stat/sonoffpow/RESULT = {"EnergyReset":{"Total":0.555,"Yesterday":0.345,"Today":0.000}}
      
      //EnergyReset2 0 Yesterday
      //stat/sonoffpow/RESULT = {"EnergyReset":{"Total":0.333,"Yesterday":0.000,"Today":0.111}}
      
      //EnergyReset3 0 Total
      //stat/sonoffpow/RESULT = {"EnergyReset":{"Total":0.000,"Yesterday":0.111,"Today":0.222}}
      
      await this.client.publish('cmnd/sonoffpow/EnergyReset1', 0);
      await this.client.publish('cmnd/sonoffpow/EnergyReset2', 0);
      await this.client.publish('cmnd/sonoffpow/EnergyReset3', 0);

    } catch(err) {

      this.logger.error(this.accessory.displayName + ': An error occured while resetting power consumption!');
      debug(err);

    } finally {

      callback();

    }
  
  }

}

module.exports = sensor_Accessory;
