'use strict';

var chart; // global chart variable
// Get data from server in JSON format (query time series when sensor was outside).
function getData() {
  $.getJSON('/sensors_query.json', function(sensors) {
    sensors.forEach(sensor => {
      // $.getJSON('/temperature_by_sensornum_query.json?start_date='+moment().format('YYYY-MM-DD')+'&end_date='+moment().add(1, 'days').format('YYYY-MM-DD')+'&sensor_num=' + sensor.sensorNum, function(temperatures) {
      $.getJSON('/temperature_by_sensornum_query.json?start_date=' + chartPeriod.periodStart + '&end_date=' + chartPeriod.periodEnd + '&sensor_num=' + sensor.sensorNum, function(temperatures) {
        chart.addSeries({
          id: sensor.sensorNum,
          name: sensor.sensorNum + ' in ' + sensor.roomName + ' (\u00B10.5\u00B0C)',
          type: 'line',
          data: temperatures
        });
      });
    });
  });
}

//create empty chart
function initEmptyChart() {
  document.getElementById("container").innerHTML = '';
  chart = new Highcharts.Chart({
    chart: {
      renderTo: 'container',
      type: 'spline',
      zoomType: 'x',
      spaceRight: 20,
      events: {
        load: getData()
      }
    },
    title: {
      text: 'Plot of temperatures from Raspberry Pi logger'
    },
    subtitle: {
      text: 'Click and drag in the plot area to zoom in',
      align: 'right',
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150,
      maxZoom: 20 * 1000,
      title: {
        text: 'Time',
        margin: 15
      }
    },
    yAxis: {
      // minPadding: 0.2,
      // maxPadding: 0.2,
      // showFirstLabel: false,
      title: {
        text: 'Temperature \u00B0C',
        margin: 15
      }
    },
    tooltip: {
      shared: true,
      crosshairs: true
    },
  });
}

var chartPeriod = {
  periodStart: '',
  periodEnd: '',
  setToday: function() {
    this.periodStart = moment().format('YYYY-MM-DD');
    this.periodEnd = moment().add(1, 'days').format('YYYY-MM-DD')
  },
  setYesterday: function() {
    this.periodStart = moment().subtract(1, 'days').format('YYYY-MM-DD');
    this.periodEnd = moment().format('YYYY-MM-DD')
  },
  set7days: function() {
    this.periodStart = moment().subtract(6, 'days').format('YYYY-MM-DD');
    this.periodEnd = moment().add(1, 'days').format('YYYY-MM-DD')
  },
  setMonth: function() {
    this.periodStart = moment().subtract(1, 'months').format('YYYY-MM-DD');
    this.periodEnd = moment().add(1, 'days').format('YYYY-MM-DD')
  }
};


// when document is ready
$(function() {
  Highcharts.setOptions({
    global: {
      useUTC: false
    }
  });

  chartPeriod.setToday();

  $('#period-pills a[data-toggle="pill"]').on('shown.bs.tab', function(e) {
    var target = $(e.target).attr("href") // activated tab
    if (target === '#container-today')
      chartPeriod.setToday();
    if (target === '#container-yesterday')
      chartPeriod.setYesterday();
    if (target === '#container-7days')
      chartPeriod.set7days();
    if (target === '#container-month')
      chartPeriod.setMonth();
    initEmptyChart();
  });

  initEmptyChart();
});
