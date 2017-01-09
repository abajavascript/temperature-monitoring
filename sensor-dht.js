//DHT11 DHT22 sensor communication

'use strict';


var sensorDHTlib = require('node-dht-sensor');
var sensorTypes = { "11": "DHT11", "22": "DHT22" };

//setup connected sensors : types and gpio
var sensors = [{ type: 22, gpio: 19 }];


// Get the temperature and humidity of a given sensor
// @param sensor : The sensor Object with type and gpio
// @param callback : callback (err, temperature, humidity)
function temperature(sensorObj, callback) {
  sensorDHTlib.read(sensorObj.type, sensorObj.gpio, (err, temperature, humidity) => {
    if (err) {
      return callback(err);
    }
    return callback(null, Math.round(temperature * 10) / 10, Math.round(humidity * 10) / 10);
  });
}
module.exports.temperature = temperature;



// Get the temperature of a all sensors
// @param callback : callback (err, array)
function temperatures(options, callback) {
  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  var sensorsValues = [];
  var sensorsCounts = 0;

  sensors.forEach((sensorObj) => {
    temperature(sensorObj, (err, temperature, humidity) => {
      if (err) {
        console.log(err);
      } else {
        var temperatureData = {
          sensorNum: sensorTypes[sensorObj.type] + "_GPIO" + sensorObj.gpio,
          temperature: temperature,
          humidity: humidity
        };
        sensorsValues.push(temperatureData);
      }
      sensorsCounts++;

      if (sensorsCounts === sensors.length) {
        return callback(null, sensorsValues);
      }
    });
  });
};
module.exports.temperatures = temperatures;

