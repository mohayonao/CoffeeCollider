define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var cc = require("../cc");
  var unit = require("./unit");
  
  describe("unit/unit.js", function() {
  });

  // unit test suite
  var parent = {
    controls: new Float32Array(16),
    doneAction: function() {
    }
  };

  var a_rate = {
    sampleRate: 44100,
    sampleDur : 1 / 44100,
    radiansPerSample: 2 * Math.PI / 44100,
    bufLength  : 64,
    bufDuration: 64 / 44100,
    bufRate    : 1 / (64 / 44100),
    slopeFactor: 1 / 64,
    filterLoops : (64 / 3)|0,
    filterRemain: (64 % 3)|0,
    filterSlope : 1 / ((64 / 3)|0)
  };
  var k_rate = {
    sampleRate: 689.0625,
    sampleDur : 1 / 689.0625,
    radiansPerSample: 2 * Math.PI / 689.0625,
    bufLength  : 1,
    bufDuration: 1 / 689.0625,
    bufRate    : 1 / (1 / 689.0625),
    slopeFactor: 1 / 1,
    filterLoops : (1 / 3)|0,
    filterRemain: (1 % 3)|0,
    filterSlope : 1 / ((1 / 3)|0)
  };

  var writeScalarValue = function(_in, val) {
    for (var i = _in.length; i--; ) {
      _in[i] = val;
    }
    return _in;
  };
  var writeWhiteNoise = function(_in) {
    for (var i = _in.length; i--; ) {
      _in[i] = Math.random() * 2 - 1;
    }
    return _in;
  };

  var inputSpec = function(name, rate, opts) {
    opts = opts || {};
    opts.name = name;
    opts.rate = rate;
    return opts;
  };
  
  var unitTestSuite = function(spec, inputSpecs, opts) {
    opts = opts || {};
    cc.getRateInstance = function(rate) {
      return (rate === C.AUDIO) ? a_rate : k_rate;
    };
    var min = typeof opts.min === "undefined" ? -1 : opts.min;
    var max = typeof opts.max === "undefined" ? +1 : opts.max;
    var i, j, k;
    var u = new unit.Unit(parent, spec);
    for (i = 0; i < u.numOfInputs; ++i) {
      u.inRates[i] = inputSpecs[i].rate;
      switch (u.inRates[i]) {
      case C.AUDIO:
        u.inputs[i]  = new Float32Array(u.rate.bufLength);
        break;
      case C.SCALAR:
        u.inputs[i]  = new Float32Array(1);
        writeScalarValue(u.inputs[i], inputSpecs[i].value || 0);
        break;
      case C.CONTROL:
        u.inputs[i]  = new Float32Array(1);
        break;
      default:
        throw new Error("Invalid rate: " + u.inRates[i]);
      }
    }
    u.init();
    
    var n = 2048;
    for (i = 0; i < n; ++i) {
      for (j = 0; j < u.numOfInputs; ++j) {
        if (inputSpecs[j].rate !== C.SCALAR) {
          if (inputSpecs[j].process) {
            inputSpecs[j].process.call(this, u.inputs[j], i, n);
          }
        }
      }
      if (opts.preProcess) {
        opts.preProcess.call(this, i, n);
      }
      u.process(u.rate, opts.instance);
      for (j = 0; j < u.numOfOutputs; ++j) {
        for (k = 0; k < u.rate.bufLength; ++k) {
          var x = u.outs[j][k];
          if (isNaN(x)) {
            throw new Error("NaN");
          }
          if (x < min || max < x) {
            throw new Error("Out of range: " + x);
          }
        }
      }
      if (opts.postProcess) {
        opts.postProcess.call(this, i, n);
      }
    }
    assert.ok(true);
  };
  
  unitTestSuite.inputSpec = inputSpec;
  unitTestSuite.writeScalarValue = writeScalarValue;
  unitTestSuite.writeWhiteNoise  = writeWhiteNoise;
  
  module.exports = {
    unitTestSuite: unitTestSuite
  };

});
