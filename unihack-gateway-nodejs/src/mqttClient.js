"use-strict";

const config = require("../config.json");
const mqtt = require('mqtt');
const logger = require("./logger");

const PREFIX = "MQTTClient";

const client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`, {
  clientId: config.clientId,
  username: config.mqtt.username,
  password: config.mqtt.password
});

class MqttClient {
  constructor() {
    this.connectedAt = null;
    this.connectedSensorTags = {};

    logger.info(`MQTT Client connecting to ${config.mqtt.host}:${config.mqtt.port}`, PREFIX);

    client.on('connect', function() {
      logger.info("MQTT Client connected!", PREFIX);
      this.connectedAt = Date.now();
    })

    client.on('message', (topic, payload) => {
      let data = {};

      // students may push non-JSON
      try {
        data = JSON.parse(Buffer.from(payload).toString('utf8'));
      } catch(e) {
        logger.warn(e);
      }

      logger.info("Recieved " + topic, PREFIX);
      logger.debug("Data Received is " + data, PREFIX);

      if (data.command === 'pushConfig') {
        var deviceID = topic.split("/")[1];
        logger.info(`Recieved pushConfig for ${deviceID}`);
        var tag = this.connectedSensorTags[deviceID];
        if(tag) {
          tag.updateConfig({});
        }
      }
      if (data.command === 'pushStatus') {
        var deviceID = topic.split("/")[1];
        logger.info(`Recieved pushStatus for ${deviceID}`);
        var tag = this.connectedSensorTags[deviceID];
        if(tag) {
          tag.updateStatus({});
        }
      }
      if (data.command === 'updateConfig') {
        var toUpdate = data.body;
        var deviceID = topic.split("/")[1];
        var device = this.connectedSensorTags[deviceID];
        if(device) {
          device.updateConfig(toUpdate);
          // Object.keys(toUpdate).forEach((key) => {
          //   device.services[key].updateConfig(toUpdate[key]);
          // })
        } else {
          logger.warn("Recieved " + topic, PREFIX);
        }
      }
    });
  }

  // static getInstance() {
  //   return instance;
  // }

  pushTelemetry(deviceID, datapoint, data) {
    // console.log(JSON.stringify(data));
    logger.info(`${deviceID}: DATAPOINT ${datapoint} pushed`, PREFIX);
    logger.debug(`${deviceID}: DATAPOINT ${JSON.stringify(data)}`, PREFIX);

    client.publish(`telemetry/${deviceID}/${datapoint}`, JSON.stringify(data));
  }

  pushConfig(deviceID, config) {
    var obj = {}
    obj = config;
    delete obj.timestamp;
    obj.timestamp = Date.now();
    logger.info(`${deviceID}: CONFIG pushed`, PREFIX);
    logger.debug(`${deviceID}: CONFIG ${JSON.stringify(obj)}`, PREFIX);

    client.publish(`configuration/${deviceID}`, JSON.stringify(obj));
  }

  pushStatus(deviceID, status) {
    var obj = {}
    obj = status;
    delete obj.timestamp;
    obj.timestamp = Date.now();
    logger.info(`${deviceID}: STATUS pushed`, PREFIX);
    logger.debug(`${deviceID}: STATUS ${JSON.stringify(obj)}`, PREFIX);
    client.publish(`status/${deviceID}`, JSON.stringify(obj));
  }

  subscribeDevice(deviceID) {
    logger.debug(`${deviceID}: SUBSCRIBED`, PREFIX);
    client.subscribe(`commands/${deviceID}`);
  }

  unsubscribeDevice(deviceID) {
    logger.debug(`${deviceID}: UNSUBSCRIBED`, PREFIX);
    client.unsubscribe(`commands/${deviceID}`);
  }
}

const instance = new MqttClient();

module.exports = instance;
