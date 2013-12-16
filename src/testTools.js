define(function(require, exports, module) {
  "use strict";

  var fs = require("fs");
  var assert = require("chai").assert;
  var cc = require("./cc/cc");
  var ops = require("./cc/common/ops");
  var slice = [].slice;
  var _random = Math.random;
  
  var Random = function() {
    var s1 = 1243598713, s2 = 3093459404, s3 = 1821928721;
    return function() {
      s1 = ((s1 & 4294967294) << 12) ^ (((s1 << 13) ^  s1) >>> 19);
      s2 = ((s2 & 4294967288) <<  4) ^ (((s2 <<  2) ^  s2) >>> 25);
      s3 = ((s3 & 4294967280) << 17) ^ (((s3 <<  3) ^  s3) >>> 11);
      return ((s1 ^ s2 ^ s3) >>> 0) / 4294967296;
    };
  };
  
  var revertRandom = function() {
    return _random;
  };
  
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
    var list = [ "__plus__","__minus__","__add__","__sub__","__mul__","__div__","__mod__" ];
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

  var asArray = function(obj) {
    if (Array.isArray(obj)) {
      return obj;
    }
    return [ obj ];
  };
  var asRateStr = function(rate) {
    return ["ir","kr","ar","demand"][rate|0];
  };
  
  var ugenTestSuite = (function() {
    var str2rate = function(str) {
      return { ar:C.AUDIO, kr:C.CONTROL, ir:C.SCALAR, demand:C.DEMAND }[str];
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
        if (args[i].charAt(0) === "-") { continue; }
        var required = (args[i].charAt(0) === "+");
        var value    = asUGenInput(args[i+1]);
        if (required) {
          params.push(value);
        }
        inputs.push(value);
      }
      return { params:params, inputs:inputs };
    };
    var args2customs = function(args) {
      var params = {}, inputs = [];
      for (var i = 0; i < args.length; i += 2) {
        if (args[i].charAt(0) === "-") { continue; }
        var required = (args[i].charAt(0) === "+");
        var value    = asUGenInput(args[i+1]);
        if (typeof value === "number") {
          value += 1;
        }
        params[args[i].replace(/^\+/, "")] = value;
        inputs.push(value);
      }
      return {
        params:params, inputs:inputs
      }
    };
    
    var ok = function(Klass, name, args) {
      var check = function(args) {
        var defaults = args2defaults(args);
        var u1 = Klass[name].apply(null, defaults.params);
        assert.equal(u1.rate, str2rate(name), "unexpected rate");
        assert.deepEqual(u1.inputs, defaults.inputs, "unexpected default inputs");
        
        var customs = args2customs(args);
        var u2 = Klass[name](customs.params);
        assert.deepEqual(u2.inputs, customs.inputs, "unexpected custom inputs");
      };
      return function() {
        if (Array.isArray(args[0])) {
          args.forEach(check);
        } else {
          check(args);
        }
      };
    };
    var ng = function(Klass, name, args) {
      var check = function(args) {
        assert.throws(function() {
          var defaults = args2defaults(args);
          Klass[name].apply(null, defaults);
        }, Error);
      };
      return function() {
        if (Array.isArray(args[0])) {
          args.forEach(check);
        } else {
          check(args);
        }
      };
    };
    
    var testSuite = function(name, specs) {
      asArray(name).forEach(function(name) {
        if (cc.ugen.specs[name]) {
          cc.ugen.register(name, cc.ugen.specs[name]);
        } else {
          throw new Error(name + " is not defined.")
        }
        describe("UGen:" + name, function() {
          mock("createMulAdd", function(_in) { return _in; });
          mock("createBinaryOpUGen", function(selector, a, b) { return a; });
          
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
              if (test.ok) { it(name, ok(Klass, name, test.ok)); }
              if (test.ng) { it(name, ng(Klass, name, test.ng)); }
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
      controls:new Float32Array(16)
    };
    parent.doneAction = function(action) {
      parent.doneAction.action = action;
    };
    parent.run = function(state) {
      parent.run.state = state;
    };
    parent.end = function() {
      parent.end.called = true;
    };
    
    Float32Array.prototype.setScalar = function(value) {
      for (var i = this.length; i--;) {
        this[i] = value;
      }
      return this;
    };
    
    var signal = function(pattern, sampleDur, name) {
      var index  = 0;
      var remain = 0;
      var prev   = 0;
      var invSampleDur = 1 / sampleDur;
      return function(_in) {
        var value = prev;
        for (var i = 0, imax = _in.length; i < imax; ++i) {
          if (remain <= 0) {
            value = pattern[index % pattern.length];
            index += 1;
            if (Array.isArray(value)) {
              remain = value[1];
              value  = value[0];
            } else {
              remain = Math.ceil(invSampleDur / (pattern.length + 1));
            }
            prev = value;
          }
          remain -= 1;
          _in[i] = value;
        }
        return _in;
      };
    };
    
    var inputSpec = function(parent, rate, value, name) {
      rate = rate || C.SCALAR;
      var sampleDur;
      if (parent === C.AUDIO && rate !== C.AUDIO) {
        sampleDur = -1;
      } else {
        sampleDur = cc.server.rates[rate].sampleDur;
      }
      var process   = (rate !== C.SCALAR) ? signal(value, sampleDur, name) : null;
      return {rate:rate, sampleDur:sampleDur, process:process, value:value, name:name};
    };
    
    var initInputs = function(num) {
      var list = [];
      for (var i = 0; i < num; i++) {
        list.push(0, 0);
      }
      return list;
    };
    var initOutputs = function(num, rate) {
      var list = [];
      for (var i = 0; i < num; i++) {
        list.push(rate);
      }
      return list;
    };
    var defaultChecker = function(statistics) {
      assert.isFalse(statistics.hasNaN, "NaN");
      assert.isFalse(statistics.hasInfinity, "Infinity");
    };
    
    var testSuite = function(name, specs, opts) {
      opts = opts || {};
      
      var test = function(items) {
        testSuite.instance = {};

        if (opts.before) beforeEach(opts.before);
        if (opts.after ) afterEach (opts.after );
        
        var rate = items.rate;
        var inputs  = initInputs(items.inputs.length);
        var outputs = initOutputs(items.outputs || 1, rate);
        
        asArray(name).forEach(function(name) {
          var unitSpec = [ name, rate, 0, inputs, outputs ];
          var testName = name + "." + asRateStr(rate);
          testName += "(" + items.inputs.map(function(_in) {
            return asRateStr(_in.rate);
          }).join(", ") + ")";
          if (opts.verbose) {
            console.log(testName);
          }
          it(testName, (function(items, opts) {
            return function() {
              var inputSpecs = items.inputs.map(function(items) {
                if (typeof items === "number") {
                  return inputSpec(rate, C.SCALAR, items);
                } else {
                  return inputSpec(rate, items.rate, items.value, items.name);
                }
              });
              var results    = unitTest(unitSpec, inputSpecs, items.checker, opts);
              var unit       = results[0];
              var statistics = results[1];
              if (!statistics.checked) {
                if (opts.checker) {
                  if (typeof opts.checker === "function") {
                    opts.checker.call(unit, statistics);
                  } else if (typeof opts.checker[name] === "function") {
                    opts.checker[name].call(unit, statistics);
                  } else {
                    defaultChecker.call(unit, statistics);
                  }
                } else {
                  defaultChecker.call(unit, statistics);
                }
              }
            };
          })(items, opts));
        });
      };
      
      describe("Unit", function() {
        mock("server");
        before(function() {
          Math.random = new Random();
        });
        after(function() {
          Math.random = _random;
        });
        specs.forEach(test);
      });
    };

    var unitTest = function(spec, inputSpecs, checker, opts) {
      opts = opts || {};

      var bufLength = opts.bufLength || 16384;
      var saved_rate = mock.server.rates[C.AUDIO];
      
      mock.server.rates[C.AUDIO] = {
        sampleRate      : 44100,
        sampleDur       : 1 / 44100,
        radiansPerSample: Math.PI * 2 / 44100,
        bufLength       : bufLength,
        bufDuration     : bufLength / 44100,
        bufRate         : 1 / (bufLength / 44100),
        slopeFactor     : 1 / bufLength,
        filterLoops     : (bufLength / 3)|0,
        filterRemain    : (bufLength % 3)|0
      };
      if (mock.server.rates[C.AUDIO].filterLoops === 0) {
        mock.server.rates[C.AUDIO].filterSlope = 0;
      } else {
        mock.server.rates[C.AUDIO].filterSlope = 1 / mock.server.rates[C.AUDIO].filterLoops;
      }
      
      var i, imax, j;
      var unit = cc.createUnit(parent, spec);
      var imax = Math.ceil(unit.rate.sampleRate / unit.rate.bufLength);
      
      for (i = 0; i < unit.numOfInputs; ++i) {
        unit.inRates[i] = inputSpecs[i].rate;
        switch (unit.inRates[i]) {
        case C.AUDIO:
          unit.inputs[i] = new Float32Array(cc.server.rates[C.AUDIO].bufLength);
          inputSpecs[i].process.call(inputSpecs[i], unit.inputs[i], 0, imax);
          break;
        case C.SCALAR:
          unit.inputs[i] = new Float32Array(cc.server.rates[C.CONTROL].bufLength);
          unit.inputs[i].setScalar(inputSpecs[i].value || 0);
          break;
        case C.CONTROL:
          unit.inputs[i] = new Float32Array(cc.server.rates[C.CONTROL].bufLength);
          inputSpecs[i].process.call(inputSpecs[i], unit.inputs[i]);
          break;
        default:
          throw new Error("invalid rate: " + unit.inRates[i]);
        }
      }
      unit.init();
      
      if (unit.calcRate !== C.SCALAR && !unit.process) {
        throw new Error("process not exists");
      }
      
      var statistics = {
        name: spec[0],
        rate: spec[1],
        process: 0,
        time   : 0,
        hasNaN     : false,
        hasInfinity: false,
        min: +Infinity,
        max: -Infinity,
        absmin: +Infinity,
        absmax: -Infinity,
        rms: 0,
        mean: 0,
        samples: 0,
        variance: 0,
      };
      var values = [];
      var begin, end;
      for (i = 0; i < imax; ++i) {
        statistics.process += 1;
        for (j = unit.numOfInputs; j--; ) {
          if (inputSpecs[j].rate !== C.SCALAR) {
            unit.inputs[j].setScalar(0);
            inputSpecs[j].process.call(inputSpecs[j], unit.inputs[j], i, imax);
          }
        }
        if (unit.process) {
          for (j = unit.allOutputs.length; j--; ) {
            unit.allOutputs[j] = NaN;
          }
          if (opts.preProcess) {
            opts.preProcess.call(unit, i, imax);
          }
          begin = Date.now();
          unit.process(unit.rate.bufLength, testSuite.instance);
          end   = Date.now();
          statistics.time += end - begin;
        }
        for (j = unit.allOutputs.length; j--; ) {
          var x = unit.allOutputs[j];
          statistics.samples += 1;
          if (isNaN(x)) {
            statistics.hasNaN = true;
          } else if (Math.abs(x) === Infinity) {
            statistics.hasInfinity = true;
          } else {
            if (x < statistics.min) {
              statistics.min = x;
            }
            if (statistics.max < x) {
              statistics.max = x;
            }
            if (Math.abs(x) < statistics.absmin) {
              statistics.absmin = Math.abs(x);
            }
            if (statistics.absmax < Math.abs(x)) {
              statistics.absmax = Math.abs(x);
            }
            values.push(x);
            statistics.mean += x;
            statistics.rms  += x * x;
          }
        }
        if (opts.postProcess) {
          opts.postProcess.call(unit, i, imax);
        }
      }
      statistics.mean = statistics.mean / statistics.samples;
      statistics.rms  = Math.sqrt(statistics.rms / statistics.samples);
      var variance = 0;
      for (i = values.length; i--; ) {
        var x = statistics.mean - values[i];
        variance += x * x;
      }
      statistics.variance = variance / (statistics.samples - 1);
      
      if (checker) {
        if (typeof checker === "function") {
          checker.call(unit, statistics);
          statistics.checked = true;
        } else if (typeof checker[spec[0]] === "function") {
          checker[spec[0]].call(unit, statistics);
          statistics.checked = true;
        }
      }
      
      mock.server.rates[C.AUDIO] = saved_rate;
      
      return [unit, statistics];
    };

    var randomTable = new Array(1024);
    var rand = new Random();
    for (var i = 0; i < 1024; ++i) {
      randomTable[i] = rand();
    }
    
    testSuite.in0 = randomTable.slice( 0).map(function(x, i) { return [ x * ((i%2)*2-1), 0] });
    testSuite.in1 = randomTable.slice(10).map(function(x, i) { return [-x * ((i%2)*2-1), 0] });
    testSuite.in1.reverse();
    testSuite.in2 = randomTable.slice(20).map(function(x, i) { return [ x * ((i%2)*2-1), 0] });
    testSuite.in3 = randomTable.slice(30).map(function(x, i) { return [-x * ((i%2)*2-1), 0] });
    testSuite.in3.reverse();
    
    testSuite.trig0 = [ [0, 100], [1, 0], [0, 1000] ];
    testSuite.trig1 = [ [0,  10], [1, 0], [0,  100] ];
    testSuite.trig2 = [ [1, 10], [0, 1000], [1, 0], [0, 2000], [-1, 100], [0, 4000] ];
    testSuite.trig3 = [ [1,  1], [0,  100], [1, 0], [0,  200], [-1,  10], [0,  400] ];
    
    return testSuite;
  })();

  // mock
  var mock = function(name, obj) {
    var target = cc;
    if (/^global\./.test(name)) {
      target = cc.global;
      name   = name.substr(7);
    }
    var substitute = obj || mock[name];
    if (typeof substitute === "undefined") {
      throw new Error("undefined mock: " + name);
    }
    before(function() {
      mock._saved[name] = target[name];
      target[name] = substitute;
    });
    if (substitute.$beforeEach) {
      beforeEach(substitute.$beforeEach);
    }
    after(function() {
      target[name] = mock._saved[name];
    });
  };
  mock._saved = {};

  mock.console = {
    log: function() {
      mock.console.log.result = slice.apply(arguments);
    },
    $beforeEach: function() {
      mock.console.log.result = null;
    }
  };
  
  mock.createWebWorker = function() {
    return {};
  };
  mock.createTimer = function() {
    return {
      isRunning: function() {
        return false;
      },
      start: function() {},
      stop : function() {}
    };
  };
  
  mock.lang = {
    sampleRate: 44100,
    rootNode  : {},
    pushToTimeline: function(cmd) {
      cc.lang.pushToTimeline.result.push(cmd);
    },
    sendToServer: function(cmd) {
      cc.lang.sendToServer.result.push(cmd);
    },
    sendToClient: function(cmd) {
      cc.lang.sendToClient.result.push(cmd);
    },
    requestBuffer: function(path, callback) {
      callback({
        samples    : new Float32Array([0, 1, 2, 3]),
        numChannels: 1,
        sampleRate : 8000,
        numFrames  : 4
      });
    },
    $beforeEach: function() {
      cc.lang.pushToTimeline.result = [];
      cc.lang.sendToServer.result   = [];
      cc.lang.sendToClient.result   = [];
    }
  };

  mock.server = {
    sampleRate: 44100,
    rates: []
  };
  mock.server.rates[C.AUDIO] = {
    sampleRate      : 44100,
    sampleDur       : 1 / 44100,
    radiansPerSample: Math.PI * 2 / 44100,
    bufLength       : 8,
    bufDuration     : 8 / 44100,
    bufRate         : 1 / (8 / 44100),
    slopeFactor     : 1 / 8,
    filterLoops     : 2,
    filterRemain    : 1,
    filterSlope     : 1 / 2
  };
  mock.server.rates[C.CONTROL] = {
    sampleRate      : 689.0625,
    sampleDur       : 1 / 689.0625,
    radiansPerSample: Math.PI * 2 / 689.0625,
    bufLength       : 1,
    bufDuration     : 1 / 689.0625,
    bufRate         : 1 / (1 / 689.0625),
    slopeFactor     : 1 / 1,
    filterLoops     : 0,
    filterRemain    : 1,
    filterSlope     : 0
  };
  mock.server.rates[C.SCALAR] = mock.server.rates[C.CONTROL];
  mock.server.rates[C.DEMAND] = mock.server.rates[C.CONTROL];
  
  mock.createMulAdd = function(a, mul, add) {
    return a * mul + add;
  };
  
  mock.createTaskManager = function() {
    return {
      start: function() {
        mock.createTaskManager.called.push("start");
      },
      reset: function() {
        mock.createTaskManager.called.push("reset");
      },
      process: function() {
        mock.createTaskManager.called.push("process");
      }
    };
  };
  mock.createTaskManager.$beforeEach = function() {
    mock.createTaskManager.called = [];
  };

  mock.createInstanceManager = function() {
    return {
      init: function() {
        mock.createInstanceManager.called.push("init");
      },
      play: function() {
        mock.createInstanceManager.called.push("play");
      },
      pause: function() {
        mock.createInstanceManager.called.push("pause");
      },
      reset: function() {
        mock.createInstanceManager.called.push("reset");
      },
      pushToTimeline: function() {
        mock.createInstanceManager.called.push("pushToTimeline");
      },
      append: function() {
        mock.createInstanceManager.called.push("append");
      },
      remove: function() {
        mock.createInstanceManager.called.push("remove");
      },
      process:function() {
        mock.createInstanceManager.called.push("process");
      }
    };
  };
  mock.createInstanceManager.$beforeEach = function() {
    mock.createInstanceManager.called = [];
  };
  
  mock.resetBuffer = function() {
    mock.resetBuffer.result = true;
  };
  mock.resetBuffer.$beforeEach = function() {
    mock.resetBuffer.result = null;
  };
  mock.resetNode = function() {
    mock.resetNode.result = true;
  };
  mock.resetNode.$beforeEach = function() {
    mock.resetNode.result = null;
  };
  mock.resetBuiltin = function() {
    mock.resetBuiltin.result = true;
  };
  mock.resetBuiltin.$beforeEach = function() {
    mock.resetBuiltin.result = null;
  };
  
  module.exports = {
    Random: Random,
    revertRandom: revertRandom,
    replaceTempNumberPrototype : replaceTempNumberPrototype,
    restoreTempNumberPrototype : restoreTempNumberPrototype,
    useFourArithmeticOperations  : useFourArithmeticOperations,
    unuseFourArithmeticOperations: unuseFourArithmeticOperations,
    shouldBeImplementedMethods : shouldBeImplementedMethods,
    ugenTestSuite: ugenTestSuite,
    unitTestSuite: unitTestSuite,
    mock: mock
  };

});
