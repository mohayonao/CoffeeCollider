define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var timevalue = function(str) {
    var result = null;
    var freq;
    if (str.charAt(0) === "~") {
      freq = true;
      str  = str.substr(1);
    }
    do {
      result = hz(str);
      if (result !== null) {
        break;
      }
      result = time(str);
      if (result !== null) {
        break;
      }
      result = hhmmss(str);
      if (result !== null) {
        break;
      }
      result = samples(str);
      if (result !== null) {
        break;
      }
      result = note(str);
      if (result !== null) {
        break;
      }
      result = beat(str);
      if (result !== null) {
        break;
      }
      result = ticks(str);
    } while (false);
    
    if (result !== null) {
      if (!freq) {
        return result;
      }
      if (result !== 0) {
        return 1 / result;
      }
    }
    return str;
  };
  
  var hz = function(str) {
    var m = /^(\d+(?:\.\d+)?)hz$/i.exec(str);
    if (m) {
      return +m[1] === 0 ? 0 : 1 / +m[1];
    }
    return null;
  };
  var time = function(str) {
    var m = /^(\d+(?:\.\d+)?)(min|sec|m)s?$/i.exec(str);
    if (m) {
      switch (m[2]) {
      case "min": return +(m[1]||0) * 60;
      case "sec": return +(m[1]||0);
      case "m"  : return +(m[1]||0) / 1000;
      }
    }
    return null;
  };

  var hhmmss = function(str) {
    var m = /^(?:([1-9][0-9]*):)?([0-5]?[0-9]):([0-5][0-9])(?:\.(\d{1,3}))?$/.exec(str);
    if (m) {
      var x = 0;
      x += (m[1]|0) * 3600;
      x += (m[2]|0) * 60;
      x += (m[3]|0);
      x += (((m[4]||"")+"00").substr(0, 3)|0) / 1000;
      return x;
    }
    return null;
  };

  var samples = function(str) {
    var m = /^(\d+)samples(?:\/(\d+)hz)?$/i.exec(str);
    if (m) {
      return m[1] / ((m[2]|0) || cc.sampleRate);
    }
    return null;
  };

  var calcNote = function(bpm, len, dot) {
    var x = (60 / bpm) * (4 / len);
    x *= [1, 1.5, 1.75, 1.875][dot] || 1;
    return x;
  };
  var note = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*l([1-9]\d*)(\.*)$/i.exec(str);
    if (m) {
      return calcNote(+m[1], +m[2], m[3].length);
    }
    return null;
  };

  var calcBeat = function(bpm, measure, beat, ticks) {
    var x = (measure * 4 + beat) * 480 + ticks;
    return (60 / bpm) * (x / 480);
  };
  var beat = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*(\d+)\.(\d+).(\d{1,3})$/i.exec(str);
    if (m) {
      return calcBeat(+m[1], +m[2], +m[3], +m[4]);
    }
    return null;
  };

  var calcTicks = function(bpm, ticks) {
    return 60 / bpm * ticks / 480;
  };
  var ticks = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*(\d+)ticks$/i.exec(str);
    if (m) {
      return calcTicks(+m[1], +m[2]);
    }
    return null;
  };
  
  var notevalue = function(str) {
    var m = /^([CDEFGAB])([-+#b])?(\d)$/.exec(str);
    if (m) {
      var midi = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[3] * 12) + 12;
      var acc = m[2];
      if (acc === "-" || acc === "b") {
        midi--;
      } else if (acc === "+" || acc === "#") {
        midi++;
      }
      return midi;
    }
    return str;
  };
  
  module.exports = {
    hz     : hz,
    time   : time,
    hhmmss : hhmmss,
    samples: samples,
    note   : note,
    beat   : beat,
    ticks  : ticks,
    calcNote : calcNote,
    calcBeat : calcBeat,
    calcTicks: calcTicks,
    timevalue: timevalue,
    notevalue: notevalue
  };

});
