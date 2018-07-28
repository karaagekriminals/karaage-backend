/*
*  mqttClient.js
*  MQTT Client for retrieving and storing data from devices
*  Author: Tyler Goodwin
*/
const mqtt = require("mqtt");

var AHRS = require("./ahrs");
var madgwick1 = new AHRS({
  /*
   * The sample interval, in Hz.
   */
  sampleInterval: 20,

  /*
   * Choose from the `Madgwick` or `Mahony` filter.
   */
  algorithm: "Madgwick",

  /*
   * The filter noise value, smaller values have
   * smoother estimates, but have higher latency.
   * This only works for the `Madgwick` filter.
   */
  beta: 0.4,

  /*
   * The filter noise values for the `Mahony` filter.
   */
  kp: 0.5,
  ki: 0
});

var madgwick2 = new AHRS({
  /*
   * The sample interval, in Hz.
   */
  sampleInterval: 20,

  /*
   * Choose from the `Madgwick` or `Mahony` filter.
   */
  algorithm: "Madgwick",

  /*
   * The filter noise value, smaller values have
   * smoother estimates, but have higher latency.
   * This only works for the `Madgwick` filter.
   */
  beta: 0.4,

  /*
   * The filter noise values for the `Mahony` filter.
   */
  kp: 0.5,
  ki: 0
});

let lastTimestamp = null;

function toRadians(angle) {
  return angle * (Math.PI / 180);
}

function toDegrees(angle) {
  return angle * (180 / Math.PI);
}

function gravityCompensate(q, acc) {
  let g = [0.0, 0.0, 0.0];

  // get expected direction of gravity
  g[0] = 2 * (q[1] * q[3] - q[0] * q[2]);
  g[1] = 2 * (q[0] * q[1] + q[2] * q[3]);
  g[2] = q[0] * q[0] - q[1] * q[1] - q[2] * q[2] + q[3] * q[3];

  // compensate accelerometer readings with the expected direction of gravity
  return [acc[0] - g[0], acc[1] - g[1], acc[2] - g[2]];
}

function MqttClient(deviceStore, config) {
  const options = {
    clientId: "mqtt-to-http-adapter",
    username: config.mqtt.username,
    password: config.mqtt.password
  };

  const topics = {
    telemetry: "telemetry/#",
    config: "configuration/#",
    status: "status/#"
  };

  var devices = deviceStore;

  const client = mqtt.connect(
    `mqtt://${config.mqtt.host}:${config.mqtt.port}`,
    options
  );

  client.on("connect", () => {
    let topicStrs = Object.values(topics);
    console.log(`[MQTT Client]\tSubscribing to: ${topicStrs}`);
    client.subscribe(topicStrs);
  });

  client.on("message", (topic, message) => {
    let { baseTopic, deviceId, extras } = splitTopic(topic);

    //Parse oclet stream to object
    let data;
    try {
      data = JSON.parse(Buffer.from(message).toString("utf8"));
    } catch (e) {
      console.error(`[MQTT Client]\tError while parsing JSON: ${e}`);
      return;
    }

    if (baseTopic === "telemetry" && isValidTelemetry(data)) {
      //Add sensor group to payload
      data.sensor = extras[0];

      if (lastTimestamp == null) {
        lastTimestamp = data.timestamp;
      }

      let deltaTime = (data.timestamp - lastTimestamp) / 1000;
      if (data != null && data.gyro != null && data.gyro.x != null) {
        let euler;
        let quat;

        if (deviceId == "98072d27a984") {
          madgwick1.update(
            toRadians(data.gyro.x.degPerSecond),
            toRadians(data.gyro.y.degPerSecond),
            toRadians(data.gyro.z.degPerSecond),
            data.accel.x.G,
            data.accel.y.G,
            data.accel.z.G,
            data.mag.x.raw,
            data.mag.y.raw,
            data.mag.z.raw,
            (deltaTimeSec = deltaTime)
          );

          euler = madgwick1.getEulerAngles();
          quat = madgwick1.getQuaternion();
        } else {
          madgwick2.update(
            toRadians(data.gyro.x.degPerSecond),
            toRadians(data.gyro.y.degPerSecond),
            toRadians(data.gyro.z.degPerSecond),
            data.accel.x.G,
            data.accel.y.G,
            data.accel.z.G,
            data.mag.x.raw,
            data.mag.y.raw,
            data.mag.z.raw,
            (deltaTimeSec = deltaTime)
          );

          euler = madgwick2.getEulerAngles();
          quat = madgwick2.getQuaternion();
        }

        client.publish("euler/" + deviceId, JSON.stringify(euler));
        client.publish("quat/" + deviceId, JSON.stringify(quat));

        lastTimestamp = data.timestamp;
      }
      //

      //store validated data
      devices.pushSensorData(deviceId, data);
      return;
    }

    if (baseTopic === "configuration" && isValidConfig(data)) {
      devices.updateConfig(deviceId, data);
      return;
    }

    if (baseTopic === "status" && isValidStatus(data)) {
      devices.updateStatus(deviceId, data);
      return;
    }

    console.error(`[MQTT Client]\tError: Receieved bad message on ${topic} with payload: ${JSON.stringify(data)}`);
  });

  return client;
}

// Verify the submitted data is valid
function isValidTelemetry(data) {
  if (data.timestamp === undefined) {
    return false;
  }

  return true;
}

function isValidConfig(data) {
  if (data === undefined) return false;

  return true;
}

function isValidStatus(data) {
  if (data === undefined) return false;

  return true;
}

//Split topic to retrieve base and deviceid
function splitTopic(topic) {
  var splitTopic = topic.split("/");
  var baseTopic = splitTopic[0];
  var deviceId = "";
  var extras = [];

  if (splitTopic.length > 1) {
    deviceId = splitTopic[1];
  }
  if (splitTopic.length > 2) {
    extras = splitTopic.slice(2);
  }
  return { baseTopic, deviceId, extras };
}

module.exports = MqttClient;
