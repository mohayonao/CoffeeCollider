define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var fn = require("../fn");
  var extend = require("../../common/extend");
  var slice  = [].slice;
  
  var addToSynthDef = null;
  var specs = {};
  
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
  
  
  var registerUGen = function(name, spec) {
    var klass = cc.global[name] = function() {
      return new UGen(name);
    };
    
    Object.keys(spec).forEach(function(key) {
      var setting   = spec[key];
      var defaults  = setting.defaults + ",tag";
      var ctor      = setting.ctor;
      var multiCall = setting.multiCall;
      if (multiCall === undefined) {
        multiCall = true;
      }
      if (setting.Klass !== null) {
        var Klass = setting.Klass || UGen;
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(new Klass(name, tag), args);
          if (instance instanceof UGen) {
            instance.tag = tag || "";
          }
          return instance;
        }).defaults(defaults).multiCall(multiCall).build();
      } else {
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(null, args);
          if (instance instanceof UGen) {
            instance.tag = tag || "";
          }
          return instance;
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
    specs       : specs,
    
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
      
      // redefinition for tests
      cc.UGen = UGen;
      cc.MultiOutUGen = MultiOutUGen;
      cc.registerUGen = registerUGen;
    },
    exports: function() {
      require("./installer").install();
      Object.keys(specs).forEach(function(name) {
        registerUGen(name, specs[name]);
      });
    }
  };

});
