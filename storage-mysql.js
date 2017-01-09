//mysql database storage
'use strict';

var mysql = require('mysql');
var passwords = require('./passwords');

// Setup database connection for logging
var db;
var sensorInfos = {};

function connectStorage() {
  db = mysql.createConnection({
    host: 'localhost',
    user: passwords.mysql.user,
    password: passwords.mysql.password,
    database: 'ds18b20'
  });
}
module.exports.connectStorage = connectStorage;

function getSensorId(temperatureData, callback) {
  if (sensorInfos[temperatureData.sensorNum]) {
    temperatureData.sensorId = sensorInfos[temperatureData.sensorNum].sensorId;
    temperatureData.roomName = sensorInfos[temperatureData.sensorNum].roomName;
    callback(null, temperatureData)
  } else {
    db.query('SELECT SensorId, RoomName FROM Sensors WHERE SensorNum = ?', [temperatureData.sensorNum], function(err, rows) {
      if (err) callback(err);
      sensorInfos[temperatureData.sensorNum] = {};
      if (rows.length === 0) {
        db.query('INSERT INTO Sensors (SensorNum) VALUES (?)', [temperatureData.sensorNum], function(err, result) {
          if (err) callback(err);
          sensorInfos[temperatureData.sensorNum].sensorId = temperatureData.sensorId = result.insertId;
          sensorInfos[temperatureData.sensorNum].roomName = temperatureData.roomName = '';
          callback(null, temperatureData);
        });
      } else {
        sensorInfos[temperatureData.sensorNum].sensorId = temperatureData.sensorId = rows[0].SensorId;
        sensorInfos[temperatureData.sensorNum].roomName = temperatureData.roomName = rows[0].RoomName;
        callback(null, temperatureData);
      }
    });
  }
}
//module.exports.getSensorId = getSensorId;

// Write a single temperature record in JSON format to database table.
function insertTemperature(temperatureData, callback) {
  getSensorId(temperatureData, function(err, temperatureData) {
    console.log('Inserting record to MySQL DB ' + JSON.stringify(temperatureData));
    db.query("INSERT INTO Temperatures (SensorId, UnixTime, TemperatureValue, HumidityValue) VALUES (?, ?, ?, ?)", [temperatureData.sensorId, temperatureData.unixTime, temperatureData.temperature, temperatureData.humidity], function(err, result) {
      if (err) {
        if (callback) {
          callback(err);
        } else {
          throw err;
        }
      }
      console.log('Last record insert to MySQL id:', result.insertId);
      if (callback)
        callback(null, temperatureData);
    });
  })
}
module.exports.insertTemperature = insertTemperature;

//code the same as in storage-direbase
function getRoomNames(temperatureDataArr, callback) {
  var temperatureDataCount = 0;
  if (!temperatureDataArr.length)
    return callback(null, temperatureDataArr);
  temperatureDataArr.forEach((item) => {
    getSensorId(item, function(err, temperatureData) {
      temperatureDataCount++;
      if (temperatureDataCount === temperatureDataArr.length)
        callback(null, temperatureDataArr);
    });
  });
}
module.exports.getRoomNames = getRoomNames;


function selectSensors(sensorNum, callback) {
  // - callback is the output function
  db.query("SELECT * FROM Sensors s WHERE (s.SensorNum = ? or ? = '') ORDER BY s.SensorNum", [sensorNum, sensorNum],
    function(err, rows) {
      if (err) {
        console.log('Error serving querying database. ' + err);
        callback(err);
      } else {
        callback(null, rows.map(item => {
          item.sensorNum = item.SensorNum; 
          item.roomName = item.RoomName; 
          return item;}));
      }
    });
};
module.exports.selectSensors = selectSensors;

// Get temperature records from database
function selectTemperatures(sensorNum, cntRows, startDate, endDate, callback) {
  // - Num records is an SQL filter from latest record back trough time series, 
  // - start_date is the first date in the time-series required, 
  // - callback is the output function
  if (cntRows <= 0)
    cntRows = 1000000000000000000;
  var current_temp = db.query("SELECT * FROM Temperatures t JOIN Sensors s ON t.SensorId = s.SensorId " +
    "WHERE t.TemperatureTime >= ? AND t.TemperatureTime < ? AND (s.SensorNum = ? or ? = '') ORDER BY t.UnixTime ASC LIMIT ?", [startDate, endDate, sensorNum, sensorNum, cntRows],
    function(err, rows) {
      if (err) {
        console.log('Error serving querying database. ' + err);
        callback(err);
      } else {
        callback(null, rows);
      }
    });
};
module.exports.selectTemperatures = selectTemperatures;

// Get temperature records from database
function selectTemperaturesBySensorNum(sensorNum, cntRows, startDate, endDate, callback) {
  // - Num records is an SQL filter from latest record back trough time series, 
  // - start_date is the first date in the time-series required, 
  // - callback is the output function
  if (cntRows <= 0)
    cntRows = 1000000000000000000;
  selectSensors(sensorNum, (err, sensors) => {
    if (sensors.length === 0)
      return callback(null, []);
    if (sensors.length > 1)
      return callback('Bad sensor number.');
    db.query("SELECT t.UnixTime as unixTime, t.TemperatureValue as temperatureValue FROM Temperatures t WHERE t.TemperatureTime >= ? AND t.TemperatureTime < ? AND t.SensorId = ? ORDER BY t.UnixTime ASC LIMIT ?", [startDate, endDate, sensors[0].SensorId, cntRows],
      function(err, rows) {
        if (err) {
          console.log('Error serving querying database. ' + err);
          callback(err);
        } else {
          //callback(null, rows.map((item) => {return {ut:Math.round(item.unixTime / 60 / 1000) * 60 * 1000, t:item.temperatureValue}}));
          callback(null, rows.map((item) => {return [Math.round(item.unixTime / 60 / 1000) * 60 * 1000, item.temperatureValue]}));
        }
      });
  });
};
module.exports.selectTemperaturesBySensorNum = selectTemperaturesBySensorNum;

