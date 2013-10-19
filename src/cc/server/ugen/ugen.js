define(function(require, exports, module) {
  "use strict";

  var fn = require("../fn");
  var slice = [].slice;

  var addToSynthDef = null;
  
  var UGen = (function() {
    function UGen(name) {
      this.klassName = name;
      this.rate = C.AUDIO;
      this.signalRange = C.BIPOLAR;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
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
        return (ugen instanceof UGen) ? ugen : ugen.valueOf();
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
  
  var OutIntarface = {
    ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        this.init.apply(this, [C.AUDIO, bus].concat(channelsArray));
        return 0; // Out has no output
      },
      Klass: Out
    },
    kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        this.init.apply(this, [C.CONTROL, bus].concat(channelsArray));
        return 0; // Out has no output
      },
      Klass: Out
    }
  };
  
  var setSynthDef = function(func) {
    addToSynthDef = func;
  };
  
  var install = function() {
    register("Out", OutIntarface);
  };
  
  var register = function(name, payload) {
    var klass = global[name] = function() {
      return new UGen(name);
    };
    Object.keys(payload).forEach(function(key) {
      var defaults = payload[key].defaults;
      var ctor     = payload[key].ctor;
      var Klass    = payload[key].Klass || UGen;
      klass[key] = fn(function() {
        return ctor.apply(new Klass(name), arguments);
      }).defaults(defaults).multiCall().build();
    });
    payload = 0;
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
