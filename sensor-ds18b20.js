//1 wire sensor communication

'use strict';

var fs = require('fs');

var W1_MASTER_FILE = '/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves';
var W1_DEVICES_DIR = '/sys/bus/w1/devices/';
var W1_SLAVE_FILE = '/w1_slave';

// Get list of all connected sensor nums as array
// @param callback(err, array)
function sensors(callback) {

  fs.readFile(W1_MASTER_FILE, 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }

    var nums = data.split('\n');
    nums = nums.filter(function(item) {
      return item.indexOf('28-') === 0;
    });
    return callback(null, nums);
  });
}
module.exports.sensors = sensors;



// Get the temperature of a given sensor
// @param sensor : The sensor Num
// @param callback : callback (err, value)
function temperature(sensorNum, options, callback) {
  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  fs.readFile(W1_DEVICES_DIR + sensorNum + W1_SLAVE_FILE, 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }

    try {
      return callback(null, parseData(data, options));
    } catch (e) {
      return callback(new Error('Can not read temperature for sensor ' + sensorNum));
    }
  });
};
module.exports.temperature = temperature;



// Get the temperature of all sensors
// @param callback : callback (err, array)
function temperatures(options, callback) {
  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  sensors(function(err, sensorNums) {
    if (err) {
      return callback(err);
    }

    var sensorsValues = [];
    var sensorsCounts = 0;

    sensorNums.forEach(function(item, i) {
      temperature(item, options, function(err, temperature) {
        if (err || temperature === false) {
          console.log(err);
        } else {
          var temperatureData = {
            sensorNum: item,
            temperature: temperature
          };
          sensorsValues.push(temperatureData);
        }
        sensorsCounts++;

        if (sensorsCounts === sensorNums.length) {
          return callback(null, sensorsValues);
        }
      })
    });
  })
};
module.exports.temperatures = temperatures;


// Utils parser

function parseHexData(data) {
  var arr = data.split(' ');

  if (arr[1].charAt(0) === 'f') {
    var x = parseInt('0xffff' + arr[1].toString() + arr[0].toString(), 16);
    return (-((~x + 1) * 0.0625));
  } else if (arr[1].charAt(0) === '0') {
    return parseInt('0x0000' + arr[1].toString() + arr[0].toString(), 16) * 0.0625;
  }
  throw new Error('Can not parse data');
}

function parseDecimalData(data) {
  var arr = data.split('\n');

  if (arr[0].indexOf('YES') > -1) {
    var output = data.match(/t=(-?(\d+))/);
    return Math.round(output[1] / 100) / 10;
  } else if (arr[0].indexOf('NO') > -1) {
    return false;
  }
  throw new Error('Can not get temperature');
}

var parsers = {
  'hex': parseHexData,
  'decimal': parseDecimalData,
  'default': parseDecimalData
};

function parseData(data, options) {
  var parser = options.parser ||  'default';
  if (!parsers[parser]) {
    parser = 'default';
  }
  return parsers[parser](data);
}
module.exports.parseData = parseData;
