define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var fn = require("../fn");
  var slice = [].slice;

  var addToSynthDef = null;
  
  var UGen = (function() {
    function UGen(name, tag) {
      this.klassName = name;
      this.tag  = tag || "";
      this.rate = C.AUDIO;
      this.signalRange = C.BIPOLAR;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
    fn.extend(UGen, cc.Object);
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this;
    };
    return UGen;
  })();
  
  var MultiOutUGen = (function() {
    function MultiOutUGen(name) {
      UGen.call(this, name || "MultiOutUGen");
      this.channels = null;
    }
    fn.extend(MultiOutUGen, UGen);
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
    fn.extend(OutputProxy, UGen);
    return OutputProxy;
  })();
  
  var Control = (function() {
    function Control(rate) {
      MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    fn.extend(Control, MultiOutUGen);
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
    fn.extend(Out, UGen);
    return Out;
  })();

  var out_ctor = function(rate) {
    return function(bus, channelsArray) {
      if (!(bus instanceof UGen || typeof bus === "number")) {
        throw new TypeError("Out: arguments[0] should be an UGen or a number.");
      }
      this.init.apply(this, [rate, bus].concat(channelsArray));
      return 0; // Out has no output
    };
  };
  
  var iOut = {
    ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.AUDIO),
      multiCall: false,
      Klass: Out
    },
    kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.CONTROL),
      multiCall: false,
      Klass: Out
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
      var Klass     = setting.Klass || UGen;
      klass[key] = fn(function() {
        var args = slice.call(arguments, 0, arguments.length - 1);
        var tag  = arguments[arguments.length - 1];
        return ctor.apply(new Klass(name, tag), args);
      }).defaults(defaults).multiCall(multiCall).build();
    });
  };
  
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
