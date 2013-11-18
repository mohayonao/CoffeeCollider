define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var utils = require("../utils");

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
        this.init.call(this, C.AUDIO);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
    },
    $kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, C.CONTROL);
        this.inputs = [ bus ];
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
  
  var out_ctor = function(rate) {
    function ctor(bus, channelsArray) {
      if (!Array.isArray(channelsArray)) {
        channelsArray = [ channelsArray ];
      }
      channelsArray = utils.flatten(channelsArray);
      if (channelsArray.length) {
        cc.UGen.prototype.init.apply(new Out(), [rate, bus].concat(channelsArray));
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
  
  cc.ugen.specs.Out = {
    Klass    : null,
    multiCall: false,
    $ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.AUDIO),
    },
    $kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(C.CONTROL),
    }
  };
  
  cc.ugen.specs.A2K = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.CONTROL, _in);
      }
    }
  };
  
  cc.ugen.specs.K2A = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.AUDIO, _in);
      }
    }
  };
  
  module.exports = {
    use: function() {
      cc.createControl = function(rate) {
        return new Control(rate);
      };
      cc.createOut = function(rate, bus, channelsArray) {
        return out_ctor(rate)(bus, channelsArray);
      };
      cc.instanceOfOut = function(obj) {
        return obj instanceof Out;
      };
    }
  };

  module.exports.use();

});
