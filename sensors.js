//Wraper for all sensor communication

'use strict';

var sensorLibs = [];


// add senspr library to use
function use(sensorLib) {
  if (sensorLib) {
    sensorLibs.push(sensorLib);
  } else {
    sensorLibs = [];
  }
}
module.exports.use = use;



// Get the temperature of all sensors
// @param callback : callback (err, array)
function temperatures(options, callback) {
  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  if (options.onStart)
    options.onStart();

  var unixTime = Date.now();
  var currentTime = new Date();
  var sensorsValues = [];
  var sensorsCounts = 0;

  sensorLibs.forEach(function(sensorLib) {
    sensorLib.temperatures(function(err, sensorsValuesByLib) {
      if (err) {
        console.log(err);
      } else {
        sensorsValuesByLib.forEach((item, i) => {
          sensorsValuesByLib[i].unixTime = unixTime;
          sensorsValuesByLib[i].currentTime = currentTime;
          sensorsValues.push(sensorsValuesByLib[i]);
        });
      }
      sensorsCounts++;

      if (sensorsCounts === sensorLibs.length) {
        if (options.onFinish)
          options.onFinish();
        return callback(null, sensorsValues);
      }
    })
  });
};
module.exports.temperatures = temperatures;
