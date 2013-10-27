define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var fn = require("../fn");
  var extend = require("../../common/extend");
  var slice = [].slice;

  var UnaryOpUGen;
  var BinaryOpUGen;
  var MulAdd;

  var addToSynthDef = null;
  
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
      return new MulAdd().init(this, mul, add);
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
      return new MulAdd().init(this, mul, add);
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
  
  var Control = (function() {
    function Control(rate) {
      MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    extend(Control, MultiOutUGen);
    Control.prototype.init = function(list) {
      UGen.prototype.init.apply(this, [this.rate].concat(list));
      this.values = list.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    return Control;
  })();

  var Out = (function() {
    function Out() {
      UGen.call(this, "Out");
    }
    extend(Out, UGen);
    return Out;
  })();

  var out_ctor = function(rate) {
    function ctor(bus, channelsArray) {
      if (!(bus instanceof UGen || typeof bus === "number")) {
        throw new TypeError("Out: arguments[0] should be an UGen or a number.");
      }
      if (!Array.isArray(channelsArray)) {
        channelsArray = [ channelsArray ];
      }
      channelsArray = channelsArray.filter(function(x) {
        return x !== 0;
      });
      if (channelsArray.length) {
        UGen.prototype.init.apply(new Out(), [rate, bus].concat(channelsArray));
      }
    }
    return function(bus, channelsArray) {
      if (Array.isArray(bus)) {
        bus.forEach(function(bus) {
          ctor(bus, channelsArray);
        });
      } else {
        ctor(bus, channelsArray);
      }
      return 0; // Out has no output
    };
  };
  
  var iOut = {
    ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.AUDIO),
      multiCall: false,
      Klass: null
    },
    kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.CONTROL),
      multiCall: false,
      Klass: null
    }
  };

  var iIn = {
    ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, C.AUDIO);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: MultiOutUGen
    },
    kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, C.CONTROL);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: MultiOutUGen
    }
  };
  
  var setSynthDef = function(func) {
    addToSynthDef = func;
  };
  
  var install = function() {
    register("Out", iOut);
    register("In" , iIn );
  };
  
  var register = function(name, payload) {
    var klass = global[name] = function() {
      return new UGen(name);
    };
    
    Object.keys(payload).forEach(function(key) {
      var setting   = payload[key];
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
  
  cc.once("basic_ops.js", function(payload) {
    UnaryOpUGen  = payload.UnaryOpUGen;
    BinaryOpUGen = payload.BinaryOpUGen;
    MulAdd       = payload.MulAdd;
  });
  
  module.exports = {
    UGen: UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    Control     : Control,
    Out         : Out,
    setSynthDef : setSynthDef,
    register: register,
    install: install,
  };

});
