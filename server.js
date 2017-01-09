// NodeJS server for the Raspberry Pi Thermal Server project.

'use strict';
// Load node modules
var express = require('express'),
  app = express();


//initialize sensor routine
var sensors = require('./sensors');
var ds18b20 = require('./sensor-ds18b20');
sensors.use(ds18b20);
var dhtSensor = require('./sensor-dht');
sensors.use(dhtSensor);

//initialize functionality for LED monitoring
var Gpio = require('onoff').Gpio;
var led = new Gpio(20, 'out');
var sensorTemperaturesOptions = {
  onStart: function(){
    led.writeSync(1);
  },
  onFinish: function(){
    led.writeSync(0);
  }
}

//initialize storage engine
var storage = require('./storages');
var firebaseStorage = require('./storage-firebase');
storage.use(firebaseStorage);
var mysqlStorage = require('./storage-mysql');
storage.use(mysqlStorage);
storage.connectStorage();


// Read current temperatures from sensors
function readTemperatures(callback) {
  sensors.temperatures(sensorTemperaturesOptions, (err, sensors) => {
    if (err) throw err;
    console.dir(sensors);
    sensors.forEach((temperatureData) => {
      callback(temperatureData);
    });
  });
};

// Create a wrapper function which we'll use specifically for logging
function logTemperatures(interval) {
  // Call the readTemperatures function with the insertTemperature function as output to get initial reading
  readTemperatures(storage.insertTemperature);
  // Set the repeat interval (milliseconds). Third argument is passed as callback function to first (i.e. readTemp(insertTemp)).
  setInterval(readTemperatures, interval, storage.insertTemperature);
};

//Log all HTTP requests to console
app.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now(), req.url);
  //console.dir(req.query);
  next();
});

app.get('/temperature_now.json', function(req, res) {
  // request for current temperature always return array with sensors, one sensor or empty array 
  //http://192.168.1.222:8000/temperature_now.json
  //http://192.168.1.222:8000/temperature_now.json?sensor_num=28-0416235ab3ff
  //http://192.168.1.222:8000/temperature_now.json?sensor_num=28-0123456781
  sensors.temperatures(sensorTemperaturesOptions, (err, sensors) => {
    if (err) throw err;
    if (req.query.sensor_num) {
      sensors = sensors.filter((item) => {
        return item.sensorNum === req.query.sensor_num;
      });
    }
    storage.getRoomNames(sensors, (err, sensors) => {
      res.json(sensors);
    })
  });
});

app.get('/sensors_query.json', function(req, res) {
  // it's a database query
  //http://192.168.1.222:8000/sensors_query.json?sensor_num=28-0123456781
  var sensorNum = req.query.sensor_num ? req.query.sensor_num : '';
  // Send a message to console log
  console.log('Database query request from ' + req.connection.remoteAddress + ' sensor ' + sensorNum + '.');
  // call selectTemperatures function to get data from database
  storage.selectSensors(sensorNum, function(err, sensorsData) {
    if (err) {
      res.status(500).send(err + "\n");
    } else {
      res.json(sensorsData);
    }
  });
});


app.get('/temperature_query.json', function(req, res) {
  // it's a database query
  //http://192.168.1.222:8000/temperature_query.json?start_date=2016-11-20&end_date=2016-11-21&sensor_num=28-0123456781&cnt_rows=100
  var cntRows = -1;
  var d = new Date;
  var startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());//in future rewrite code to use moment.js
  var endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); //2016, 11 (Dec), 32 => 2017, 0 (Jan), 1
  var sensorNum = '';

  if (req.query.cnt_rows) {
    cntRows = parseInt(req.query.cnt_rows);
  }
  if (req.query.start_date) {
    startDate = new Date(req.query.start_date);
  }
  if (req.query.end_date) {
    endDate = new Date(req.query.end_date);
  }
  if (req.query.sensor_num) {
    sensorNum = req.query.sensor_num;
  }
  // Send a message to console log
  console.log('Database query request from ' + req.connection.remoteAddress + ' sensor ' + sensorNum + ' for ' + cntRows + ' records from ' + startDate + ' to ' + endDate + '.');
  // call selectTemperatures function to get data from database
  storage.selectTemperatures(sensorNum, cntRows, startDate, endDate, function(err, sensorsData) {
    if (err) {
      res.status(500).send(err + "\n");
    } else {
      res.json(sensorsData);
    }
  });
});

app.get('/temperature_by_sensornum_query.json', function(req, res) {
  // it's a database query
  //http://192.168.1.222:8000/temperature_query.json?start_date=2016-11-20&end_date=2016-11-21&sensor_num=28-0123456781&cnt_rows=100
  var cntRows = req.query.cnt_rows ? parseInt(req.query.cnt_rows) : -1;

  var d = new Date;

  var startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(d.getFullYear(), d.getMonth(), d.getDate());//in future rewrite code to use moment.js
  var endDate = req.query.end_date ?new Date(req.query.end_date) : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); //2016, 11 (Dec), 32 => 2017, 0 (Jan), 1
  var sensorNum = req.query.sensor_num;
  // Send a message to console log
  console.log('Database query request from ' + req.connection.remoteAddress + ' sensor ' + sensorNum + ' for ' + cntRows + ' records from ' + startDate + ' to ' + endDate + '.');
  // call selectTemperatures function to get data from database
  storage.selectTemperaturesBySensorNum(sensorNum, cntRows, startDate, endDate, function(err, sensorsData) {
    if (err) {
      res.status(500).send(err + "\n");
    } else {
      res.json(sensorsData);
    }
  });
});

//static mapping
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/', express.static(__dirname + '/html'));
app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/favicon.ico');
});

// Start temperature logging (every 1 min).
var msecs = (60 * 1) * 1000; // log interval duration in milliseconds
logTemperatures(msecs);
// Send a message to console
console.log('Server is logging temperature to database at ' + msecs + 'ms intervals');

// Enable server
app.listen(8000);
// Log message
console.log('Server running at http://localhost:8000');
