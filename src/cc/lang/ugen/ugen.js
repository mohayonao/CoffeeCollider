define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var fn = require("../fn");
  var extend = require("../../common/extend");
  var ops = require("../../common/ops");
  var slice  = [].slice;
  
  var addToSynthDef = null;
  var specs = {};
  cc.ugen = {
    specs:specs,
    checkSameRateAsFirstInput: function(ugen) {
      if (ugen.rate !== ugen.inputs[0].rate) {
        var strRate = ["ir","kr","ar"][ugen.rate];
        throw new TypeError("first input is not " + strRate + " rate");
      }
    }
  };
  
  var UGen = (function() {
    function UGen(name) {
      this.klassName = name;
      this.tag  = "";
      this.rate = C.AUDIO;
      this.signalRange = C.BIPOLAR;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
    extend(UGen, cc.Object);
    
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this;
    };

    UGen.prototype.__plus__ = function() {
      return this;
    };
    UGen.prototype.__minus__ = function() {
      return this.neg();
    };
    fn.setupBinaryOp(UGen, "__add__", function(b) {
      return cc.createBinaryOpUGen("+", this, b);
    });
    fn.setupBinaryOp(UGen, "__sub__", function(b) {
      return cc.createBinaryOpUGen("-", this, b);
    });
    fn.setupBinaryOp(UGen, "__mul__", function(b) {
      return cc.createBinaryOpUGen("*", this, b);
    });
    fn.setupBinaryOp(UGen, "__div__", function(b) {
      return cc.createBinaryOpUGen("/", this, b);
    });
    fn.setupBinaryOp(UGen, "__mod__", function(b) {
      return cc.createBinaryOpUGen("%", this, b);
    });
    
    UGen.prototype.madd = fn(function(mul, add) {
      return cc.createMulAdd(this, mul, add);
    }).defaults("mul=1,add=0").multiCall().build();
    
    UGen.prototype.range = fn(function(lo, hi) {
      var mul, add;
      if (this.signalRange === C.BIPOLAR) {
        mul = (hi - lo) * 0.5;
        add = mul + lo;
      } else {
        mul = (hi - lo);
        add = lo;
      }
      return cc.createMulAdd(this, mul, add);
    }).defaults("lo=0,hi=1").multiCall().build();
    
    UGen.prototype.unipolar = fn(function(mul) {
      return this.range(0, mul);
    }).defaults("mul=1").multiCall().build();
    
    UGen.prototype.bipolar = fn(function(mul) {
      return this.range(mul.neg(), mul);
    }).defaults("mul=1").multiCall().build();

    UGen.prototype.clip = fn(function(lo, hi) {
      return cc.global.Clip(this.rate, this, lo, hi);
    }).defaults("lo=1,hi=1").multiCall().build();

    UGen.prototype.fold = fn(function(lo, hi) {
      return cc.global.Fold(this.rate, this, lo, hi);
    }).defaults("lo=1,hi=1").multiCall().build();
    
    UGen.prototype.wrap = fn(function(lo, hi) {
      return cc.global.Wrap(this.rate, this, lo, hi);
    }).defaults("lo=1,hi=1").multiCall().build();
    
    UGen.prototype.lag = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag(this.rate, this, t1);
      }
      return cc.global.LagUD(this.rate, this, t1, t2);
    }).defaults("t1=0.1,t2").multiCall().build();
    
    UGen.prototype.lag2 = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag2(this.rate, this, t1);
      }
      return cc.global.Lag2UD(this.rate, this, t1, t2);
    }).defaults("t1=0.1,t2").multiCall().build();
    
    UGen.prototype.lag3 = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag3(this.rate, this, t1);
      }
      return cc.global.Lag3UD(this.rate, this, t1, t2);
    }).defaults("t1=0.1,t2").multiCall().build();
    
    UGen.prototype.lagud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.LagUD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults("lagTimeU=0.1,lagTimeD=0.1").multiCall().build();
    
    UGen.prototype.lag2ud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.Lag2UD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults("lagTimeU=0.1,lagTimeD=0.1").multiCall().build();
    
    UGen.prototype.lag3ud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.Lag3UD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults("lagTimeU=0.1,lagTimeD=0.1").multiCall().build();

    UGen.prototype.linlin = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.LinLin(
        this.rate,
        prune.call(this, inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build();

    UGen.prototype.linexp = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.LinExp(
        this.rate,
        prune.call(this, inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build();
    
    UGen.prototype.explin = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.ExpLin(
        this.rate,
        prune.call(this, inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build();
    
    UGen.prototype.expexp = fn(function(inMin, inMax, outMin, outMax, clip) {
      return outMax.__div__(outMin).pow(prune.call(this, inMin, inMax, clip).__div__(inMin).log().__div__(inMax.__div__(inMin).log())).__mul__(outMin);
    }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build();
    
    ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        UGen.prototype[selector] = function() {
          return cc.createUnaryOpUGen(selector, this);
        };
      }
    });
    
    ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        fn.setupBinaryOp(UGen, selector, function(b) {
          return cc.createBinaryOpUGen(selector, this, b);
        });
      }
    });

    var prune = function(min, max, type) {
      switch (type) {
      case "minmax":
        return this.clip(min, max);
      case "min":
        return this.max(min);
      case "max":
        return this.min(max);
      }
      return this;
    };
    
    return UGen;
  })();
  
  var MultiOutUGen = (function() {
    function MultiOutUGen(name) {
      UGen.call(this, name || "MultiOutUGen");
      this.channels = null;
    }
    extend(MultiOutUGen, UGen);
    MultiOutUGen.prototype.initOutputs = function(numChannels, rate) {
      var channels = new Array(numChannels);
      for (var i = 0; i < numChannels; ++i) {
        channels[i] = new OutputProxy(rate, this, i);
      }
      this.channels = channels;
      this.numOfOutputs = channels.length;
      this.inputs = this.inputs.map(function(ugen) {
        if (!(ugen instanceof UGen)) {
          ugen = +ugen;
          if (isNaN(ugen)) {
            ugen = 0;
          }
        }
        return ugen;
      });
      this.numOfInputs = this.inputs.length;
      return (numChannels === 1) ? channels[0] : channels;
    };
    return MultiOutUGen;
  })();
  
  var OutputProxy = (function() {
    function OutputProxy(rate, source, index) {
      UGen.call(this, "OutputProxy");
      this.init(rate);
      this.inputs = [ source ];
      this.numOfOutputs = 1;
      this.outputIndex  = index;
    }
    extend(OutputProxy, UGen);
    return OutputProxy;
  })();

  var checkBadInput = function(ugen) {
    ugen.inputs.forEach(function(_in, i) {
      if (!(typeof _in === "number" || _in instanceof UGen)) {
        throw new TypeError("arg[" + i + "] bad input");
      }
    });
  };
  
  var init_instance = function(instance, tag, checkInputs) {
    if (Array.isArray(instance)) {
      instance.forEach(function(ugen) {
        if (ugen instanceof UGen) {
          checkBadInput(instance);
          if (checkInputs) {
            checkInputs(instance);
          }
          instance.tag = tag || "";
        }
      });
    } else if (instance instanceof UGen) {
      checkBadInput(instance);
      if (checkInputs) {
        checkInputs(instance);
      }
      instance.tag = tag || "";
    }
    return instance;
  };
  
  
  var registerUGen = function(name, spec) {
    var BaseClass = (spec.Klass === null) ? null : (spec.Klass || UGen);
    var multiCall   = spec.multiCall;
    var checkInputs = spec.checkInputs;
    if (multiCall === undefined) {
      multiCall = true;
    }

    var klass;
    if (spec.$new) {
      klass = function() {
        return cc.global[name]["new"].apply(null, slice.call(arguments));
      };
    } else {
      klass = function(rate) {
        if (typeof rate === "number") {
          rate = ["ir", "kr", "ar"][rate];
        }
        var func = cc.global[name][rate];
        if (func) {
          return func.apply(null, slice.call(arguments, 1));
        }
        return new UGen(name);
      };
    }
    cc.global[name] = klass;
    
    Object.keys(spec).forEach(function(key) {
      if (key.charAt(0) !== "$") {
        return;
      }
      var setting   = spec[key];
      var defaults  = setting.defaults + ",tag";
      var ctor      = setting.ctor;
      key = key.substr(1);
      if (BaseClass !== null) {
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(new BaseClass(name, tag), args);
          return init_instance(instance, tag, checkInputs);
        }).defaults(defaults).multiCall(multiCall).build();
      } else {
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(null, args);
          return init_instance(instance, tag, checkInputs);
        }).defaults(defaults).multiCall(multiCall).build();
      }
    });
  };
  
  
  // exports for prototype extending
  cc.UGen = UGen;
  cc.MultiOutUGen = MultiOutUGen;
  cc.registerUGen = registerUGen;
  
  module.exports = {
    UGen        : UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    
    use: function() {
      cc.createUGen = function() {
        return new UGen();
      };
      cc.createOutputProxy = function(rate, source, index) {
        return new OutputProxy(rate, source, index);
      };
      cc.instanceOfUGen = function(obj) {
        return obj instanceof UGen;
      };
      cc.instanceOfMultiOutUGen = function(obj) {
        return obj instanceof MultiOutUGen;
      };
      cc.instanceOfOutputProxy = function(obj) {
        return obj instanceof OutputProxy;
      };
      cc.setSynthDef = function(func) {
        if (func && addToSynthDef !== null) {
          throw new Error("nested Synth.def");
        }
        addToSynthDef = func;
      };
      
      require("./uop");
      require("./bop");
      require("./madd");
      require("./inout");
      require("./mix");
      require("./filter");
      
      // redefinition for tests
      cc.UGen = UGen;
      cc.MultiOutUGen = MultiOutUGen;
      cc.registerUGen = registerUGen;
    }
  };
  
  require("./bufio");
  require("./debug");
  require("./decay");
  require("./delay");
  require("./filter");
  require("./inout");
  require("./line");
  require("./noise");
  require("./osc");
  require("./pan");
  require("./random");
  require("./range");
  require("./reverb");
  require("./ui");
  
  Object.keys(specs).forEach(function(name) {
    registerUGen(name, specs[name]);
  });
  
  module.exports.use();

});
