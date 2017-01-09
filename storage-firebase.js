//mysql database storage
'use strict';

var firebase = require('firebase');
var passwords = require('./passwords');

// Setup database connection for logging
var db;
var sensorInfos = {};

function connectStorage() {
  firebase.initializeApp(passwords.firebase.config);
  firebase.auth().signInWithEmailAndPassword(passwords.firebase.email, passwords.firebase.password);
  db = firebase.database();
}
module.exports.connectStorage = connectStorage;

function getSensorKey(temperatureData, callback) {

  function setupTemperatureDataFromSensorInfos() {
    temperatureData.sensorKey = sensorInfos[temperatureData.sensorNum].sensorKey;
    if (!temperatureData.roomName)
      temperatureData.roomName = sensorInfos[temperatureData.sensorNum].roomName;
  }

  if (sensorInfos[temperatureData.sensorNum]) {
    setupTemperatureDataFromSensorInfos();
    callback(null, temperatureData)
  } else {
    db.ref('/sensors').orderByChild('sensorNum').equalTo(temperatureData.sensorNum).limitToFirst(1).once('value').then(snapshot => {
      sensorInfos[temperatureData.sensorNum] = {};
      if (!snapshot.exists()) {
        var newRef = db.ref('/sensors').push();
        newRef.set({ roomName: '', sensorNum: temperatureData.sensorNum }).then(() => {
          sensorInfos[temperatureData.sensorNum].sensorKey = newRef.key;
          sensorInfos[temperatureData.sensorNum].roomName = '';
          setupTemperatureDataFromSensorInfos();
          callback(null, temperatureData);
        });
      } else {
        snapshot.forEach(child => {
          sensorInfos[temperatureData.sensorNum].sensorKey = child.key;
          sensorInfos[temperatureData.sensorNum].roomName = child.val().roomName;
          setupTemperatureDataFromSensorInfos();
        });
        callback(null, temperatureData);
      }
    });
  }
}
module.exports.getSensorKey = getSensorKey;

// Write a single temperature record in JSON format to database table.
function insertTemperature(temperatureData, callback) {
  getSensorKey(temperatureData, function(err, temperatureData) {
    console.log('Inserting record to Firebase ' + JSON.stringify(temperatureData));
    var newRef = db.ref('/temperatures/' + temperatureData.sensorKey).push();
    newRef.set(undefinedToNull({
      unixTime: temperatureData.unixTime,
      temperatureValue: temperatureData.temperature,
      humidityValue: temperatureData.humidity
    })).then(() => {
      console.log('Last record insert to Firebase key:', newRef.key);
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
    getSensorKey(item, function(err, temperatureData) {
      temperatureDataCount++;
      if (temperatureDataCount === temperatureDataArr.length)
        callback(null, temperatureDataArr);
    });
  });
}
module.exports.getRoomNames = getRoomNames;

function selectSensors(sensorNum, callback) {
  // - callback is the output function
  var sensorsQuery = db.ref('/sensors').orderByChild('sensorNum');
  if (sensorNum)
    sensorsQuery = sensorsQuery.equalTo(sensorNum).limitToFirst(1);
  sensorsQuery.once('value').then(snapshot => {
    var resultSensors = [];
    snapshot.forEach(child => {
      resultSensors.push({
        sensorKey: child.key,
        roomName: child.val().roomName,
        sensorNum: child.val().sensorNum
      });
    });
    callback(null, resultSensors);
  });
};
module.exports.selectSensors = selectSensors;

// Get temperature records from database
function selectTemperatures(sensorNum, cntRows, startDate, endDate, callback) {
  // - Num records is an SQL filter from latest record back trough time series, 
  // - start_date is the first date in the time-series required, 
  // - callback is the output function
  selectSensors(sensorNum, (err, resultSensors) => {
    var resultTemperatures = [];
    var sensorsProcessedCount = 0;
    resultSensors.forEach((sensor, i) => {
      var temperaturesQuery = db.ref('/temperatures/' + sensor.sensorKey).orderByChild('unixTime').startAt(startDate.getTime()).endAt(endDate.getTime());
      if (cntRows > 0)
        temperaturesQuery = temperaturesQuery.limitToFirst(cntRows /* /resultSensors.length */ );
      temperaturesQuery.once('value').then(snapshot => {
        snapshot.forEach(child => {
          resultTemperatures.push({
            SensorId: i,
            SensorKey: child.key,
            roomName: sensor.roomName,
            SensorNum: sensor.sensorNum,
            UnixTime: child.val().unixTime,
            TemperatureValue: child.val().temperatureValue,
            HumidityValue: child.val().humidityValue
          });
        });
        sensorsProcessedCount++;
        if (sensorsProcessedCount === resultSensors.length)
          callback(null, resultTemperatures);
      });
    });
  });
};
module.exports.selectTemperatures = selectTemperatures;

function selectTemperaturesBySensorNum(sensorNum, cntRows, startDate, endDate, callback) {
  // - Num records is an SQL filter from latest record back trough time series, 
  // - start_date is the first date in the time-series required, 
  // - callback is the output function
  selectSensors(sensorNum, (err, resultSensors) => {
    if (resultSensors.length === 0)
      return callback(null, []);
    if (resultSensors.length > 1)
      return callback('Bad sensor number.');
    var resultTemperatures = [];
    var temperaturesQuery = db.ref('/temperatures/' + resultSensors[0].sensorKey).orderByChild('unixTime').startAt(startDate.getTime()).endAt(endDate.getTime());
    if (cntRows > 0)
      temperaturesQuery = temperaturesQuery.limitToFirst(cntRows);
    temperaturesQuery.once('value').then(snapshot => {
      snapshot.forEach(child => {
        // resultTemperatures.push({
        //   ut: Math.round(child.val().unixTime / 60 / 1000) * 60 * 1000,
        //   t: child.val().temperatureValue
        // });
        resultTemperatures.push([
          Math.round(child.val().unixTime / 60 / 1000) * 60 * 1000,
          child.val().temperatureValue
        ]);
      });
      callback(null, resultTemperatures);
    });
  });
};
module.exports.selectTemperaturesBySensorNum = selectTemperaturesBySensorNum;

function undefinedToNull(obj) {
  for (var prop in obj) {
    if (obj[prop] === undefined)
      obj[prop] = null
  }
  return obj;
}
