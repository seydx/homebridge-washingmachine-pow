'use strict';

const debug = require('debug')('WMPow');
const https = require('https');
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
    this.mainService = this.accessory.getService(Service.MotionSensor, this.accessory.displayName + ' Sensor');

    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {

    this.mainService.getCharacteristic(Characteristic.MotionDetected)
      .on('change', this.changeValue.bind(this));
      
    if(!this.mainService.testCharacteristic(Characteristic.Duration))
      this.mainService.addCharacteristic(Characteristic.Duration);
      
    if(!this.mainService.testCharacteristic(Characteristic.LastActivation))
      this.mainService.addCharacteristic(Characteristic.LastActivation);
      
    if(!this.mainService.testCharacteristic(Characteristic.Sensitivity))
      this.mainService.addCharacteristic(Characteristic.Sensitivity);
      
    this.mainService.getCharacteristic(Characteristic.Duration)
      .on('get', callback => callback(null, 5))
      .on('set', (value, callback) => callback());
      
    this.mainService.getCharacteristic(Characteristic.Sensitivity)
      .on('get', callback => callback(null, 0))
      .updateValue(0);
      
    this.historyService = new FakeGatoHistoryService('motion', {displayName: this.accessory.displayName, log: this.log}, {storage:'fs',path:this.HBpath, disableTimer: false, disableRepeatLastData:false});

  }
  
  async changeValue(value){
  
    try {

      if(value.newValue){
    
        this.logger.info(this.accessory.displayName + ': Motion detected!');
        let message = this.accessory.context.notifier.motionOn;
        
        if(this.accessory.context.notifier.active)
          await this.sendTelegram(this.accessory.context.notifier.token, this.accessory.context.notifier.chatID, message);
          
        let lastActivation = moment().unix() - this.historyService.getInitialTime();
        
        this.mainService.getCharacteristic(Characteristic.LastActivation)
          .updateValue(lastActivation);

      } else {
    
        this.logger.info(this.accessory.displayName + ': No motion!');
        
        let message = this.accessory.context.notifier.motionOff;
        
        if(this.accessory.context.notifier.active)
          await this.sendTelegram(this.accessory.context.notifier.token, this.accessory.context.notifier.chatID, message);
    
      }
      
      let state = value.newValue ? 1 : 0;
      
      this.historyService.addEntry({time: moment().unix(), status: state});

    } catch(err) {

      this.logger.error(this.accessory.displayName + ': An error occured!');
      debug(err);

    }
  
  }
  
  sendTelegram(token,chatID,text){
    
    return new Promise((resolve,reject)=>{
      
      const post_data = JSON.stringify({
        chat_id: chatID,
        text: text,
        parse_mode: 'Markdown'
      });
      
      const postheaders = {
        'Content-Type' : 'application/json'
      };
      
      const options = {
        host:'api.telegram.org',
        path:'/bot' + token + '/sendMessage',
        method:'POST',
        headers : postheaders
      };
      
      const req = https.request(options,function (res){
      
        if(res.statusCode<200||res.statusCode>299){
          reject(new Error('Failed to load data, status code:'+res.statusCode));
        }
        
        const body=[];
        res.on('data',(chunk)=>body.push(chunk));
        res.on('end',()=>resolve(body.join('')));
        
      });
      
      req.on('error',(err)=>reject(err));
      req.write(post_data);
      req.end();
      
    });
    
  }

}

module.exports = sensor_Accessory;
