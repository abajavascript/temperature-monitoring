//database storage controling
'use strict';

var databaseReadLib;
var databaseWriteLibs = [];


// add database where to store data
function use(databaseLib) {
  if (databaseLib) {
    databaseWriteLibs.push(databaseLib);
    databaseReadLib = databaseLib;
  } else {
    databaseReadLib = undefined;
    databaseWriteLibs = [];
  }
}
module.exports.use = use;


//connect to all storages
function connectStorage() {
  databaseWriteLibs.forEach(item => item.connectStorage());
}
module.exports.connectStorage = connectStorage;


// Write a single temperature record in JSON format to database table.
function insertTemperature(temperatureData, callback) {
  var databaseLibCount = 0;
  databaseWriteLibs.forEach((item) => {
    item.insertTemperature(temperatureData, () => {
      databaseLibCount++;
      if (databaseLibCount === databaseWriteLibs.length)
        if (callback)
          callback(null, temperatureData);
    })
  })
}
module.exports.insertTemperature = insertTemperature;

function getRoomNames(temperatureDataArr, callback) {
  databaseReadLib.getRoomNames(temperatureDataArr, callback);
}
module.exports.getRoomNames = getRoomNames;

// Get temperature records from database
function selectSensors(sensorNum, callback) {
  databaseReadLib.selectSensors(sensorNum, callback);
};
module.exports.selectSensors = selectSensors;

// Get temperature records from database
function selectTemperatures(sensorNum, cntRows, startDate, endDate, callback) {
  databaseReadLib.selectTemperatures(sensorNum, cntRows, startDate, endDate, callback);
};
module.exports.selectTemperatures = selectTemperatures;

function selectTemperaturesBySensorNum(sensorNum, cntRows, startDate, endDate, callback) {
  databaseReadLib.selectTemperaturesBySensorNum(sensorNum, cntRows, startDate, endDate, callback);
};
module.exports.selectTemperaturesBySensorNum = selectTemperaturesBySensorNum;
