'use strict';
const refreshInterval = 20; //query for temperature and refresh chart every N seconds
const lineChartPointCount = 30;

function refreshChartsAll() {
  $.getJSON('/temperature_now.json', function(data) {
    //add new or refresh existing
    data.forEach((item) => {
      refreshChartGauge(item);
    });
    //remove gauge charts for disapeared sensors. Check all existing charts for appropriate sensor in response
    document.querySelectorAll(".gauge-container").forEach((item) => {
      if (data.filter((sensor) => {
          return item.dataset.sensorNum === sensor.sensorNum;
        }).length === 0) {
        item.remove();
      }
    });
    //update line chart
    refreshLineChart(data);
  });
}

function refreshChartGauge(dataItem) {
  var container = document.getElementById('container');
  var gaugeContainer = document.querySelector('.gauge-container[data-sensor-num="' + dataItem.sensorNum + '"]');
  var chart;
  if (gaugeContainer) {
    chart = gaugeContainer.chart;
  } else {
    gaugeContainer = document.createElement('div');
    gaugeContainer.className = "gauge-container";
    gaugeContainer.dataset.sensorNum = dataItem.sensorNum;
    container.appendChild(gaugeContainer);
  }
  if (chart) {
    var point = chart.series[0].points[0];
    point.update(dataItem.temperature);
  } else {
    gaugeContainer.chart = chart = Highcharts.chart(gaugeContainer, {

      chart: {
        type: 'gauge',
        plotBackgroundColor: null,
        plotBackgroundImage: null,
        plotBorderWidth: 0,
        plotShadow: false
      },

      title: {
        text: dataItem.roomName
      },

      subtitle: {
        text: dataItem.sensorNum
      },

      pane: {
        startAngle: -150,
        endAngle: 150,
        background: [{
          backgroundColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1
            },
            stops: [
              [0, '#FFF'],
              [1, '#333']
            ]
          },
          borderWidth: 0,
          outerRadius: '109%'
        }, {
          backgroundColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1
            },
            stops: [
              [0, '#333'],
              [1, '#FFF']
            ]
          },
          borderWidth: 1,
          outerRadius: '107%'
        }, {
          // default background
        }, {
          backgroundColor: '#DDD',
          borderWidth: 0,
          outerRadius: '105%',
          innerRadius: '103%'
        }]
      },

      // the value axis
      yAxis: {
        min: -40,
        max: 120,

        minorTickInterval: 'auto',
        minorTickWidth: 1,
        minorTickLength: 10,
        minorTickPosition: 'inside',
        minorTickColor: '#666',

        tickPixelInterval: 30,
        tickWidth: 2,
        tickPosition: 'inside',
        tickLength: 10,
        tickColor: '#666',
        labels: {
          step: 2,
          rotation: 'auto'
        },
        title: {
          text: '\xB0C'
        },
        plotBands: [{
          from: -40,
          to: 10,
          color: '#553BBF' // green
        }, {
          from: 10,
          to: 55,
          color: '#55BF3B' // green
        }, {
          from: 55,
          to: 98,
          color: '#DDDF0D' // yellow
        }, {
          from: 98,
          to: 120,
          color: '#DF5353' // red
        }]
      },

      series: [{
        name: 'Temperature',
        data: [dataItem.temperature],
        tooltip: {
          valueSuffix: ' \xB0C'
        }
      }]
    });
  }
};

function refreshLineChart(data) {
  var lineContainer = document.getElementById('line-container');
  var chart;
  var x = (new Date()).getTime();
  if (lineContainer.chart) {
    chart = lineContainer.chart;
    data.forEach((sensor) => {
      var serieIndex = chart.getSerieIndexBySensorNum(sensor.sensorNum);
      if (serieIndex >= 0){
          chart.series[serieIndex].addPoint([x, sensor.temperature], true, true);
      } else {
        var newSerie = initLineSerie(x, sensor);
        chart.addSeries(newSerie);
      }
    });
    for (var i = chart.series.length - 1; i >= 0 ; i--) {
      if (chart.series[i].data[chart.series[i].data.length - 1].x !== x) {
        chart.series[i].remove();
      }
    }
  } else {
    var series = [];
    data.forEach(function(sensor) {
      series.push(initLineSerie(x, sensor));
    });
    lineContainer.chart = chart = Highcharts.chart(lineContainer, {
      chart: {
        type: 'spline',
        animation: Highcharts.svg, // don't animate in old IE
        marginRight: 10
      },
      title: {
        text: 'Live temperature data'
      },
      xAxis: {
        type: 'datetime',
        tickPixelInterval: 150
      },
      yAxis: {
        title: {
          text: 'Temperature'
        },
        plotLines: [{
          value: 0,
          width: 1,
          color: '#808080'
        }]
      },
      tooltip: {
        formatter: function() {
          return '<b>' + this.series.name + '</b><br/>' +
            Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
            Highcharts.numberFormat(this.y, 2);
        }
      },
      exporting: {
        enabled: false
      },
      series: series
    });

    chart.getSerieIndexBySensorNum = getSerieIndexBySensorNum;

  }

  function getSerieIndexBySensorNum(sensorNum) {
    for (var i = 0; i < chart.series.length; i++) {
      if (chart.series[i].name.indexOf(sensorNum) >= 0) {
        return i;
      }
    }
    return -1;
  }


  function initLineSerie(x, sensor) {
    var serie = {
      name: sensor.roomName + " " + sensor.sensorNum,
      data: []
    };
    for (var i = lineChartPointCount - 1; i > 0; i--) {
      serie.data.push({ x: x - i * refreshInterval * 1000, y: undefined })
    }
    serie.data.push({ x: x, y: sensor.temperature })
    return serie;
  }
}

// when document is ready
$(function() {
  Highcharts.setOptions({
    global: {
      useUTC: false
    }
  });


  refreshChartsAll();
  setInterval(refreshChartsAll, refreshInterval * 1000);
});
