define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var cc = require("../cc");
  var unit = require("./unit");
  
  describe("unit/unit.js", function() {
    var parent;
    before(function() {
      unit.use();
      parent = {
        doneAction: function(action, tag) {
          parent.doneAction.result = action;
        }
      };
      cc.getRateInstance = function(rate) {
        return {
          bufLength: 64
        };
      };
      cc.console = {
        warn: function(str) {
          cc.console.warn.result = str;
        }
      };
      cc.unit.specs.TestUnit = function() {
        cc.unit.specs.TestUnit.called = true;
      };
    });
    it("create", function() {
      var specs = [
        "TestUnit", C.AUDIO, 1, [ 0, 0, 0, 0 ], [ 2 ], ""
      ];
      var u = cc.createUnit(parent, specs);
      assert.instanceOf(u, unit.Unit);
      assert.equal(u.name, "TestUnit");
      assert.equal(u.calcRate, C.AUDIO);
      assert.equal(u.specialIndex, 1);
      assert.equal(u.numOfInputs , 2);
      assert.equal(u.numOfOutputs, 1);
      assert.isArray(u.inputs);
      assert.isArray(u.outputs);
      assert.equal(u.numOfInputs, u.inputs.length);
      assert.equal(u.numOfOutputs, u.outputs.length);
      assert.equal(u.bufLength   , 64);
      assert.isFalse(u.done);
    });
    it("init", function() {
      var specs = [
        "TestUnit", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      cc.unit.specs.TestUnit.called = false;
      var u = cc.createUnit(parent, specs).init("tag");
      assert.isTrue(cc.unit.specs.TestUnit.called);
      assert.equal(u.tag, "tag");
    });
    it("init(not exist)", function() {
      var specs = [
        "TestUnit(not exist)", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      cc.console.warn.result = null;
      var u = cc.createUnit(parent, specs).init("tag");
      assert.isString(cc.console.warn.result);
    });
    it("doneAction", function() {
      var specs = [
        "TestUnit", 0, 0, [ 0, 0, 0, 0 ], [ 2 ], ""
      ];
      var u = cc.createUnit(parent, specs);
      parent.doneAction.result = null;
      u.doneAction(2);
      assert.equal(parent.doneAction.result, 2);
      
      parent.doneAction.result = null;
      u.doneAction(2);
      assert.isNull(parent.doneAction.result);
    });
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

  var writeScalarValue = function(_in, value) {
    for (var i = _in.length; i--; ) {
      _in[i] = value;
    }
    return _in;
  };
  
  var writer = {};
  writer.whiteNoise = function() {
    return function(_in) {
      for (var i = _in.length; i--; ) {
        _in[i] = Math.random() * 2 - 1;
      }
      return _in;
    };
  };
  writer.liner = function(start, end, dur) {
    var value = start;
    return function(_in) {
      var valueIncr = (end - start) * (this.sampleDur / dur);
      for (var i = 0, imax = _in.length; i < imax; ++i) {
        _in[i] = value;
        if (value < end) {
          value += valueIncr;
        }
      }
      return _in;
    };
  };
  writer.tri = function(offset) {
    var index = offset || 0;
    var pattern = [-1.0, -0.8, -0.6, -0.4, -0.2, -0, +0.2, +0.4, +0.6, +0.8,
                   +1.0, +0.8, +0.6, +0.4, +0.2, +0, -0.2, -0.4, -0.6, -0.8 ];
    return function(_in) {
      writeScalarValue(_in, pattern[(index++) % pattern.length]);
      return _in;
    };
  };
  
  var inputSpec = function(opts) {
    var rate = (opts.rate === C.AUDIO) ? a_rate : k_rate;
    opts.sampleDur = rate.sampleDur;
    return opts;
  };

  var ratesCombination = function(n) {
    var m = Math.pow(3, n);
    var result = new Array(m);
    for (var i = 0; i < m; ++i) {
      result[i] = new Array(n);
      for (var j = 0; j < n; ++j) {
        result[i][j] = ((i / Math.pow(3, j))|0) % 3;
      }
    }
    return result;
  };
  
  var unitTestSuite = function(spec, inputSpecs, opts) {
    opts = opts || {};
    
    unit.use();
    cc.getRateInstance = function(rate) {
      return (rate === C.AUDIO) ? a_rate : k_rate;
    };
    
    var min = typeof opts.min === "undefined" ? -Infinity : opts.min;
    var max = typeof opts.max === "undefined" ? +Infinity : opts.max;
    var i, j, k;
    var u = cc.createUnit(parent, spec);
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
    
    var n = ((u.rate.sampleRate * (opts.dur || 1)) / u.rate.bufLength)|0;
    for (i = 0; i < n; ++i) {
      for (j = 0; j < u.numOfInputs; ++j) {
        if (inputSpecs[j].rate !== C.SCALAR) {
          if (inputSpecs[j].process) {
            inputSpecs[j].process.call(inputSpecs[j], u.inputs[j], i, n);
          }
        }
      }
      if (opts.preProcess) {
        opts.preProcess.call(u, i, n);
      }
      if (u.process) {
        u.process(u.rate.bufLength, opts.instance);
        for (j = u.allOutputs.length; j--; ) {
          var x = u.allOutputs[j];
          if (isNaN(x)) {
            throw new Error("NaN");
          }
          if (x < min || max < x) {
            throw new Error("Out of range: " + x);
          }
        }
        if (opts.validator) {
          opts.validator.call(u, u.inputs, u.outputs);
        }
      }
      if (opts.postProcess) {
        opts.postProcess.call(u, i, n);
      }
    }
    assert.ok(true);
  };
  
  unitTestSuite.inputSpec = inputSpec;
  unitTestSuite.ratesCombination = ratesCombination;
  unitTestSuite.writer = writer;
  
  module.exports = {
    unitTestSuite: unitTestSuite
  };

});
