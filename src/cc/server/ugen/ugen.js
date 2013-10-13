define(function(require, exports, module) {
  "use strict";

  var fn = require("../fn");
  var C  = fn.constant;
  var array = require("../array.impl");
  var slice = [].slice;

  var addToSynthDef = null;

  var UGen = (function() {
    function UGen() {
      this.klassName = "UGen";
      this.rate = C.AUDIO;
      this.signalRange = C.BIPOLAR;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }

    UGen.prototype.$new1 = function(rate) {
      var args = slice.call(arguments, 1);
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.numOfInputs = this.inputs.length;
      return this.initialize.apply(this, args);
    };
    UGen.prototype.$multiNew = function() {
      return this.multiNewList(slice.call(arguments));
    };
    UGen.prototype.$multiNewList = function(list) {
      var zipped = array.zip.apply(null, list);
      if (zipped.length === 1) {
        return this.new1.apply(this, list);
      }
      return zipped.map(function(list) {
        return this.constructor.multiNewList(list);
      }, this);
    };
    fn.classmethod(UGen);

    UGen.prototype.initialize = function() {
      this.inputs = slice.call(arguments);
      return this;
    };
    
    return UGen;
  })();

  var MultiOutUGen = (function() {
    function MultiOutUGen() {
      UGen.call(this);
      this.klassName = "MultiOutUGen";
      this.channels = null;
    }
    fn.extend(MultiOutUGen, UGen);
    fn.classmethod(MultiOutUGen);
    
    MultiOutUGen.prototype.initOutputs = function(numChannels, rate) {
      var channels = new Array(numChannels);
      for (var i = 0; i < numChannels; ++i) {
        channels[i] = OutputProxy.new(rate, this, i);
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
    function OutputProxy() {
      UGen.call(this);
      this.klassName = "OutputProxy";
    }
    fn.extend(OutputProxy, UGen);

    OutputProxy.prototype.$new = function(rate, source, index) {
      return this.new1(rate, source, index);
    };
    fn.classmethod(OutputProxy);

    OutputProxy.prototype.initialize = function(source, index) {
      this.inputs = [ source ];
      this.numOfInputs = 1;
      this.outputIndex = index;
      return this;
    };
    
    return OutputProxy;
  })();

  var Control = (function() {
    function Control() {
      MultiOutUGen.call(this);
      this.klassName = "Control";
      this.values = [];
    }
    fn.extend(Control, MultiOutUGen);

    Control.prototype.$kr = function(values) {
      return this.multiNewList([C.CONTROL].concat(values));
    };
    fn.classmethod(Control);

    Control.prototype.initialize = function() {
      this.values = slice.call(arguments);
      return this.initOutputs(this.values.length, this.rate);
    };

    return Control;
  })();

  var Out = (function() {
    function Out() {
      UGen.call(this);
      this.klassName = "Out";
      this.numOutputs = 0;
    }
    fn.extend(Out, UGen);

    Out.prototype.$ar = fn(function(bus, channelsArray) {
      this.multiNewList([C.AUDIO, bus].concat(channelsArray));
      return 0; // Out has no output
    }).defaults("bus=0,channelsArray=0").build();
    Out.prototype.$kr = fn(function(bus, channelsArray) {
      this.multiNewList([C.CONTROL, bus].concat(channelsArray));
      return 0; // Out has no output
    }).defaults("bus=0,channelsArray=0").build();
    
    fn.classmethod(Out);
    
    return Out;
  })();

  var setSynthDef = function(func) {
    addToSynthDef = func;
  };

  var install = function(namespace) {
    namespace.Out = Out;
  };

  module.exports = {
    UGen: UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    Control     : Control,
    Out         : Out,
    setSynthDef : setSynthDef,
    install: install,
  };

});
