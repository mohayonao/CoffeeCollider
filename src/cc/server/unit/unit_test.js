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
  
  var signal = function(offset) {
    var index = offset || 0;
    var pattern = [
      +100, 10, 1, 1, 0.5, 0.5, 0, 0, 0, -0.5, -0.5, -1, -1, -10, -100
    ];
    return function(_in) {
      var value = pattern[(index++) % pattern.length];
      writeScalarValue(_in, value);
      return _in;
    };
  };
  
  var inputSpec = function(opts) {
    var rate = (opts.rate === C.AUDIO) ? a_rate : k_rate;
    opts.sampleDur = rate.sampleDur;
    return opts;
  };
  
  var unitTest = function(spec, inputSpecs, opts) {
    opts = opts || {};
    
    unit.use();
    cc.getRateInstance = function(rate) {
      return (rate === C.AUDIO) ? a_rate : k_rate;
    };
    
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
          writeScalarValue(u.inputs[j], 0);
          inputSpecs[j].process.call(inputSpecs[j], u.inputs[j], i, n);
        }
      }
      if (opts.preProcess) {
        opts.preProcess.call(u, i, n);
      }
      if (u.process) {
        u.process(u.rate.bufLength, unitTestSuite.instance);
        for (j = u.allOutputs.length; j--; ) {
          var x = u.allOutputs[j];
          if (isNaN(x)) {
            throw new Error("NaN");
          }
        }
      }
      if (opts.postProcess) {
        opts.postProcess.call(u, i, n);
      }
    }
    assert.ok(true);
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
  
  var unitTestSuite = function(name, suites, opts) {
    opts = opts || {};
    describe(name, function() {
      suites.forEach(function(items) {
        var name = items[0];
        var rates = items[1].map(function(rate) {
          return {"ar":C.AUDIO,"kr":C.CONTROL,"ir":C.SCALAR}[rate];
        });
        var numOfInputs  = items[2];
        var numOfOutputs = items[3];
        
        unitTestSuite.instance = {};
        
        if (opts.before) {
          beforeEach(opts.before);
        }
        if (opts.beforeEach) {
          beforeEach(opts.beforeEach);
        }
        if (opts.after) {
          afterEach(opts.after);
        }
        if (opts.afterEach) {
          afterEach(opts.afterEach);
        }
        
        var list = ratesCombination(numOfInputs+1).filter(function(items) {
          return rates.indexOf(items[0]) !== -1;
        });
        if (opts.filter) {
          list = list.map(function(items) {
            return { rate:items[0], inRates:items.slice(1) };
          }).filter(opts.filter).map(function(obj) {
            return [ obj.rate ].concat(obj.inRates);
          });
        }
        
        list.forEach(function(rates) {
          var inputs = [], outputs = [];
          var i;
          for (i = numOfInputs; i--; ) {
            inputs.push(0, 0);
          }
          for (i = numOfOutputs; i--; ) {
            outputs.push(rates[0]);
          }
          var spec = [ name, rates[0], 0, inputs, outputs ];
          var rateStr = ["ir","kr","ar"][rates[0]];
          
          items = rates.slice(1);
          var caseName = items.map(function(rate) {
            return ["ir","kr","ar"][rate];
          }).join(", ");
          var testName = name + "." + rateStr + "(" + caseName + ")";
          if (opts.verbose) {
            console.log(testName);
          }
          it(testName, (function(items) {
            return function() {
              var inputSpecs = items.map(function(rate, i) {
                return inputSpec({
                  rate   : rate,
                  process: signal(i * 3),
                });
              });
              unitTest(spec, inputSpecs, opts);
            };
          })(items));
        });
      });
    });
  };

  unitTestSuite.filterUGen = function(obj) {
    var rate    = obj.rate;
    var inRates = obj.inRates;
    if (inRates[0] === C.SCALAR) {
      return false;
    }
    if (rate !== inRates[0]) {
      return false;
    }
    return true;
  };
  
  cc.checkInvalidValue = function(out) {
    for (var i = out.length; i--; ) {
      if (isNaN(out[i]) || Math.abs(out[i]) === Infinity) {
        return true;
      }
    }
    return false;
  };
  
  module.exports = {
    unitTestSuite: unitTestSuite,
  };

});
