'use strict';

const Logger = require('./logger.js');

const FormData = require('form-data');

class Telegram {
  constructor(options, messages) {
    this.token = options.token;
    this.chatID = options.chatID;
    this.messages = messages;

    this.request = {
      protocol: 'https:',
      host: 'api.telegram.org',
      port: 443,
      method: 'POST',
      path: '/bot' + this.token + '/sendMessage',
    };
  }

  send(dest, replacer) {
    if (this.messages[dest]) {
      let message =
        this.messages[dest].includes('@') && replacer
          ? this.messages[dest].replace('@', replacer)
          : this.messages[dest];

      const form = new FormData();

      let chatIDs = [];
      if (this.chatID.includes(',')) {
        chatIDs = this.chatID.split(',');
      } else {
        chatIDs = [this.chatID];
      }

      let i;
      for (i = 0; i < chatIDs.length; i++) {
        this.request.headers = form.getHeaders();
        form.append('chat_id', chatIDs[i]);
        form.append('parse_mode', 'Markdown');
        form.append('text', message);

        Logger.debug('Telegram: Sending Message: ' + message);

        form.submit(this.request, (err, res) => {
          if (err) {
            Logger.error('An error occured during sending telegram message!');
            Logger.error(err);
          }

          if (res.statusCode < 200 || res.statusCode > 200) {
            Logger.error('A response error occured during sending telegram message!');
            Logger.error({
              code: res.statusCode,
              message: res.statusMessage,
            });
          }
        });
      }
    } else {
      Logger.debug('Telegram: Skip sending, no message defined for ' + dest);
    }
  }
}

module.exports = Telegram;
