define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var pan2_ctor = function(rate) {
    return function(_in, pos, level) {
      this.init.call(this, rate, _in, pos, level);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    };
  };
  
  cc.ugen.specs.Pan2 = {
    _Klass: cc.MultiOutUGen,
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.AUDIO)
    },
    kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.CONTROL),
    }
  };
  
  module.exports = {};

});
