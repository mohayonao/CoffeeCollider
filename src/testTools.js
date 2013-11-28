define(function(require, exports, module) {
  "use strict";

  var fs = require("fs");
  var assert = require("chai").assert;
  var cc = require("./cc/cc");
  var ops = require("./cc/common/ops");
  var slice = [].slice;
  var _Math = Math;

  var randomTable = fs.readFileSync(__dirname + "/random.txt").toString().split(",").map(Number);
  
  var defineProperty = function(object, selector, value) {
    var ret = object[selector];
    Object.defineProperty(object, selector, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : value
    });
    return ret;
  };
  
  var _savedNumber = {};
  var _savedArray  = {};
  var replaceTempNumberPrototype = function(selector, hack, callback) {
    _savedNumber[selector] = defineProperty(Number.prototype, selector, hack);
    if (!Array.prototype[selector]) {
      _savedArray[selector] = defineProperty(Array .prototype, selector, function() {
        var args = slice.call(arguments);
        return this.map(function(x) {
          return x[selector].apply(x, args);
        });
      });
    } else {
      _savedArray[selector] = null;
    }
    if (callback) {
      callback();
      restoreTempNumberPrototype(selector);
    }
  };
  var restoreTempNumberPrototype = function(selector) {
    var savedNumber = _savedNumber[selector];
    var savedArray  = _savedArray[selector];
    if (savedNumber) {
      defineProperty(Number.prototype, selector, savedNumber);
    } else if (savedNumber === undefined) {
      delete Number.prototype[selector];
    }
    if (savedArray) {
      defineProperty(Array.prototype, selector, savedArray);
    } else if (savedArray === undefined) {
      delete Array.prototype[selector];
    }
  };

  var __add__ = function(b) { return this + b; };
  var __sub__ = function(b) { return this - b; };
  var __mul__ = function(b) { return this * b; };
  var __div__ = function(b) { return this / b; };
  
  var useFourArithmeticOperations = function(callback) {
    if (callback) {
      replaceTempNumberPrototype("__add__", __add__, function() {
        replaceTempNumberPrototype("__sub__", __sub__, function() {
          replaceTempNumberPrototype("__mul__", __mul__, function() {
            replaceTempNumberPrototype("__div__", __div__, function() {
              callback();
            });
          });
        });
      });
    } else {
      replaceTempNumberPrototype("__add__", __add__);
      replaceTempNumberPrototype("__sub__", __sub__);
      replaceTempNumberPrototype("__mul__", __mul__);
      replaceTempNumberPrototype("__div__", __div__);
    }
  };

  var unuseFourArithmeticOperations = function() {
    restoreTempNumberPrototype("__add__");
    restoreTempNumberPrototype("__sub__");
    restoreTempNumberPrototype("__mul__");
    restoreTempNumberPrototype("__div__");
  };
  
  var shouldBeImplementedMethods = function() {
    var list = [ "__plus__","__minus__","__add__","__sub__","__mul__","__div__","__mod__","__and__","__or__" ];
    list = list.concat(Object.keys(ops.UNARY_OPS).filter(function(selector) {
      return /^[a-z]/.test(selector);
    }));
    list = list.concat(Object.keys(ops.BINARY_OPS).filter(function(selector) {
      return /^[a-z]/.test(selector);
    }));
    list = list.concat(Object.keys(ops.ARITY_OPS));
    list = list.concat(Object.keys(ops.COMMONS));
    return list;
  };
  
  var registerUGen = function(name) {
    if (cc.ugen.specs[name]) {
      cc.ugen.register(name, cc.ugen.specs[name]);
    } else {
      throw new Error(name + " is not defined.")
    }
  };

  var ugenTestSuite = (function() {
    var str2rate = function(str) {
      return {ar:C.AUDIO,kr:C.CONTROL,ir:C.SCALAR,demand:C.DEMAND}[str];
    };
    var asUGenInput = function(val) {
      if (typeof testSuite[val] === "function") {
        return testSuite[val]();
      }
      return val;
    };
    var args2defaults = function(args) {
      var params = [], inputs = [];
      for (var i = 0; i < args.length; i += 2) {
        if (args[i].charAt(0) !== "-") {
          var x = asUGenInput(args[i+1]);
          if (args[i].charAt(0) === "+") {
            params.push(x);
          }
          inputs.push(x);
        }
      }
      return {
        params:params, inputs:inputs
      }
    };
    var args2customs = function(args) {
      var params = {}, inputs = [];
      for (var i = 0; i < args.length; i += 2) {
        if (args[i].charAt(0) !== "-") {
          var name = args[i];
          var x    = args[i+1];
          x = typeof x === "number" ? (x + 1) : asUGenInput(x);
          if (name.charAt(0) === "+") {
            name = name.substr(1);
          }
          inputs.push( params[name] = x );
        }
      }
      return {
        params:params, inputs:inputs
      }
    };
    var testSuite = function(name, specs) {
      if (!Array.isArray(name)) {
        name = [ name ];
      }
      name.forEach(function(name) {
        if (cc.ugen.specs[name]) {
          cc.ugen.register(name, cc.ugen.specs[name]);
        } else {
          throw new Error(name + " is not defined.")
        }
        describe("UGen:" + name, function() {
          var _createMulAdd, _createBinaryOpUGen;
          before(function() {
            _createMulAdd = cc.createMulAdd;
            _createBinaryOpUGen = cc.createBinaryOpUGen;
            cc.createMulAdd = function(_in) { return _in; }
            cc.createBinaryOpUGen = function(selector, a, b) { return a; }
          });
          after(function() {
            cc.createMulAdd = _createMulAdd;
            cc.createBinaryOpUGen = _createBinaryOpUGen;
          });
          var tests = specs;
          var Klass = cc.global[name];
          if (typeof specs === "function") {
            tests = specs(Klass);
          }
          Object.keys(tests).forEach(function(name) {
            var test = tests[name];
            if (typeof test === "function") {
              it(name, test);
            } else {
              if (Array.isArray(test)) {
                test.ok = test;
              }
              if (test.ok) {
                it(name, (function(args) {
                  var check = function(args) {
                    var defaults = args2defaults(args);
                    var u1 = Klass[name].apply(null, defaults.params);
                    assert.equal(u1.rate, str2rate(name), "unexpected rate");
                    assert.deepEqual(u1.inputs, defaults.inputs, "unexpected inputs");
                    
                    var customs = args2customs(args);
                    var u2 = Klass[name](customs.params);
                    assert.equal(u2.rate, str2rate(name), "unexpected rate");
                    assert.deepEqual(u2.inputs, customs.inputs, "unexpected inputs");
                  };
                  return function() {
                    if (Array.isArray(args[0])) {
                      args.forEach(function(args) {
                        check(args);
                      });
                    } else {
                      check(args);
                    }
                  };
                })(test.ok));
              }
              if (test.ng) {
                it(name, (function(args) {
                  var check = function(args) {
                    assert.throws(function() {
                      var defaults = args2defaults(args);
                      Klass[name].apply(null, defaults);
                    });
                  };
                  return function() {
                    if (Array.isArray(args[0])) {
                      args.forEach(function(args) {
                        check(args);
                      });
                    } else {
                      check(args);
                    }
                  };
                })(test.ng));
              }
            }
          });
        });
      });
      return {
        unitTestSuite: function(specs, opts) {
          return unitTestSuite(name, specs, opts);
        }
      };
    };
    testSuite.audio = function() {
      var instance = new cc.UGen("Audio");
      instance.rate = C.AUDIO;
      this.inputs   = [ 1 ];
      return instance;
    };
    testSuite.control = function() {
      var instance = new cc.UGen("Control");
      instance.rate = C.CONTROL;
      this.inputs   = [ 2 ];
      return instance;
    };
    testSuite.scalar = function() {
      var instance = new cc.UGen("Scalar");
      instance.rate = C.SCALAR;
      this.inputs   = [ 3 ];
      return instance;
    };
    testSuite.demand = function() {
      var instance = new cc.UGen("Demand");
      instance.rate = C.DEMAND;
      this.inputs   = [ 4 ];
      return instance;
    };
    return testSuite;
  })();
  
  var unitTestSuite = (function() {
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
      if (Array.isArray(offset)) {
        index   = 0;
        pattern = offset;
        return function(_in) {
          var value = pattern[(index++) % pattern.length];
          writeScalarValue(_in, value);
          return _in;
        };
      } else {
        var index = offset || 0;
        var pattern = [
            +100, 10, 1, 1, 0.5, 0.5, 0, 0, 0, -0.5, -0.5, -1, -1, -10, -100
        ];
        return function(_in) {
          var value = pattern[(index++) % pattern.length];
          writeScalarValue(_in, value);
          return _in;
        };
      }
    };
    
    var inputSpec = function(opts) {
      var rate = (opts.rate === C.AUDIO) ? a_rate : k_rate;
      opts.sampleDur = rate.sampleDur;
      return opts;
    };
    
    var unitTest = function(spec, inputSpecs, checker, opts) {
      opts = opts || {};
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

      if (u.calcRate !== C.SCALAR && !u.process) {
        throw new Error("process not exists");
      }

      var result = {
        name: spec[0],
        rate: spec[1],
        hasNaN     : false,
        hasInfinity: false,
        min: +Infinity,
        max: -Infinity,
        absmin: +Infinity,
        absmax: -Infinity,
        rms: 0,
        mean: 0,
        samples: 0,
        ivalues: [],
      };
      
      var n, prev = undefined;
      var values = [];
      if (opts.dur === Infinity) {
        n = Infinity;
      } else {
        n = ((u.rate.sampleRate * (opts.dur || 1)) / u.rate.bufLength)|0;
      }
      for (i = 0; i < n; ++i) {
        for (j = 0; j < u.numOfInputs; ++j) {
          if (inputSpecs[j].rate !== C.SCALAR) {
            writeScalarValue(u.inputs[j], 0);
            inputSpecs[j].process.call(inputSpecs[j], u.inputs[j], i, n);
          }
        }
        if (u.process) {
          for (j = u.allOutputs.length; j--; ) {
            u.allOutputs[j] = NaN;
          }
          if (opts.preProcess) {
            opts.preProcess.call(u, i, n);
          }
          u.process(u.rate.bufLength, testSuite.instance);
          for (j = u.allOutputs.length; j--; ) {
            var x = u.allOutputs[j];
            result.samples += 1;
            if (isNaN(x)) {
              result.hasNaN = true;
            } else if (Math.abs(x) === Infinity) {
              result.hasInfinity = true;
            } else {
              if (x < result.min) {
                result.min = x;
              }
              if (result.max < x) {
                result.max = x;
              }
              if (Math.abs(x) < result.absmin) {
                result.absmin = Math.abs(x);
              }
              if (result.absmax < Math.abs(x)) {
                result.absmax = Math.abs(x);
              }
              values.push(x);
              result.mean += x;
              result.rms  += x * x;
              if (x === (x|0)) {
                if (prev !== x) {
                  if (result.ivalues.indexOf(x) === -1) {
                    result.ivalues.push(x);  
                  }
                }
                prev = x;
              }
            }
          }
        }
        if (opts.postProcess) {
          opts.postProcess.call(u, i, n);
        }
        if (n === Infinity) {
          if (i > 500 && result.rms !== 0) {
            break;
          }
        }
      }
      result.ivalues.sort();
      result.mean = result.mean / result.samples;
      result.rms  = Math.sqrt(result.rms / result.samples);
      var variance = 0;
      for (i = values.length; i--; ) {
        var x = result.mean - values[i];
        variance += x * x;
      }
      result.variance = variance / result.samples;
      
      if (checker) {
        if (typeof checker === "function") {
          checker(result);
          return;
        } else if (typeof checker[spec[0]] === "function") {
          checker[spec[0]](result);
          return;
        }
      }
      defaultChecker(result);
    };
    
    var defaultChecker = function(result) {
      assert.isFalse(result.hasNaN, "NaN");
      assert.isFalse(result.hasInfinity, "Infinity");
    };

    var RandomGenerator = function() {
      var i = 0;
      return function() {
        return randomTable[i++ % randomTable.length];
      };
    };
    
    var testSuite = function(name, specs, opts) {
      opts = opts || {};
      var _getRateInstance;
      describe("Unit", function() {
        before(function() {
          _getRateInstance = cc.getRateInstance;
          cc.getRateInstance = function(rate) {
            return (rate === C.AUDIO) ? a_rate : k_rate;
          };
          Math.random = RandomGenerator();
        });
        after(function() {
          cc.getRateInstance = _getRateInstance;
          Math.random = _Math.random;
        });
        specs.forEach(function(items) {
          var rate = items.rate;
          var numOfInputs  = items.inputs.length;
          var numOfOutputs = items.outputs || 1;

          testSuite.instance = {};
          
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
          
          var inputs = [], outputs = [];
          var i;
          for (i = numOfInputs; i--; ) {
            inputs.push(0, 0);
          }
          for (i = numOfOutputs; i--; ) {
            outputs.push(rate);
          }
          if (!Array.isArray(name)) {
            name = [name];
          }
          name.forEach(function(name) {
            var unitSpec = [ name, rate, 0, inputs, outputs ];
            var testName = name + "." + ["ir","kr","ar"][rate];
            testName += "(" + items.inputs.map(function(_in) {
              return ["ir","kr","ar"][_in.rate|0];
            }).join(", ") + ")";
            if (opts.verbose) {
              console.log(testName);
            }
            it(testName, (function(items) {
              return function() {
                var inputSpecs = items.inputs.map(function(items) {
                  if (typeof items === "number") {
                    return inputSpec({
                      rate:C.SCALAR, value:items
                    });
                  } else {
                    return inputSpec({
                      rate   : items.rate || C.SCALAR,
                      process: signal(items.value),
                      value  : items.value
                    });
                  }
                });
                unitTest(unitSpec, inputSpecs, items.checker, opts);
              };
            })(items));
          });
        });
      });
    };

    testSuite.in0   = [ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ];
    testSuite.in1   = [ -0, -0.25, -0.5, -1, 1, 0.5, 0.25, 0 ];
    testSuite.in2   = [ -0, -0.25, -0.5, -1, 1, 0.5, 0.25    ];
    testSuite.time0 = [ 0, 0, 0.5, 0.5, 1, 1 ];
    testSuite.time1 = [ 0, 0, 0.5, 0.5, 1, 1, -0, -0.5, -1 ];
    testSuite.freq0 = [ 220, 220, 440, 660, 880, 1760, 3520 ];
    testSuite.freq1 = [ 220, 220, 440, 660, 880, 1760, 44100, 0, -44100 ];
    testSuite.trig0 = [ 1, 0, 0, 0, 0, 0, 0, 0 ];
    testSuite.trig1 = [ 1, 0, 0, 0,-1, 0, 0, 0 ];
    testSuite.trig2 = [ 1, 1, 1, 1, 1, 1, 1, 1 ];
    
    return testSuite;
  })();
  
  
  module.exports = {
    replaceTempNumberPrototype : replaceTempNumberPrototype,
    restoreTempNumberPrototype : restoreTempNumberPrototype,
    useFourArithmeticOperations  : useFourArithmeticOperations,
    unuseFourArithmeticOperations: unuseFourArithmeticOperations,
    shouldBeImplementedMethods : shouldBeImplementedMethods,
    registerUGen : registerUGen,
    ugenTestSuite: ugenTestSuite,
    unitTestSuite: unitTestSuite,
  };

});
