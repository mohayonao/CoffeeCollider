define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../../common/extend");

  var Control = (function() {
    function Control(rate) {
      cc.MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    extend(Control, cc.MultiOutUGen);
    Control.prototype.init = function(list) {
      cc.UGen.prototype.init.apply(this, [this.rate].concat(list));
      this.values = list.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    return Control;
  })();
  
  cc.ugen.specs.In = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        cc.ugen.multiNewList(this, [C.AUDIO]);
        this.inputs = Array.isArray(bus) ? bus : [bus];
        return this.initOutputs(numChannels, this.rate);
      },
    },
    $kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        cc.ugen.multiNewList(this, [C.CONTROL]);
        this.inputs = Array.isArray(bus) ? bus : [bus];
        return this.initOutputs(numChannels, this.rate);
      }
    }
  };
  
  
  var Out = (function() {
    function Out() {
      cc.UGen.call(this, "Out");
    }
    extend(Out, cc.UGen);
    return Out;
  })();
  
  cc.ugen.specs.Out = {
    Klass: Out,
    $ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        cc.ugen.multiNewList(this, [C.AUDIO, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    },
    $kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        cc.ugen.multiNewList(this, [C.CONTROL, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    }
  };
  
  cc.ugen.specs.A2K = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]);
      }
    }
  };
  
  cc.ugen.specs.K2A = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]);
      }
    }
  };

  cc.createControl = function(rate) {
    return new Control(rate);
  };
  cc.instanceOfOut = function(obj) {
    return obj instanceof Out;
  };
  
  module.exports = {};

});
