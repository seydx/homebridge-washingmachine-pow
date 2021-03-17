'use strict';

const Logger = require('../helper/logger.js');

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

class MotionAccessory {

  constructor (api, accessory, FakeGatoHistoryService) {
    
    this.api = api;
    this.accessory = accessory;
    this.FakeGatoHistoryService = FakeGatoHistoryService;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.MotionSensor);
    
    if(!service){
      Logger.info('Adding Motion service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.MotionSensor, this.accessory.displayName, this.accessory.context.config.type);
    }
    
    if(!service.testCharacteristic(this.api.hap.Characteristic.LastActivation))
      service.addCharacteristic(this.api.hap.Characteristic.LastActivation);
    
    this.historyService = new this.FakeGatoHistoryService('motion', this.accessory, {storage:'fs'}); 
    
    await timeout(250);
    
    service.getCharacteristic(this.api.hap.Characteristic.MotionDetected)
      .on('change', this.changedState.bind(this));
      
    this.refreshHistory(service)
    
  }
  
  changedState(value){
  
    if(value.oldValue !== value.newValue){
    
      Logger.info(value.newValue ? 'Started' : 'Finished', this.accessory.displayName);
    
      let lastActivation = Math.round(new Date().valueOf() / 1000) - this.historyService.getInitialTime();
      
      this.accessory
        .getService(this.api.hap.Service.MotionSensor)
        .getCharacteristic(this.api.hap.Characteristic.LastActivation)
        .updateValue(lastActivation);
    
      this.historyService.addEntry({time: Math.round(new Date().valueOf() / 1000), status: value.newValue ? 1 : 0});
    
    }
  
  }
  
  refreshHistory(service){ 
    
    let state = service.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).value;
    
    this.historyService.addEntry({
      time: Math.round(new Date().valueOf() / 1000), 
      status: state ? 1 : 0
    });
    
    setTimeout(() => {
      this.refreshHistory(service);
    }, 10 * 60 * 1000);
    
  }

}

module.exports = MotionAccessory;