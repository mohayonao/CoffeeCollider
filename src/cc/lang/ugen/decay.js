define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Integrator = {
    ar: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.AUDIO, _in, coef).mad(mul, add);
      }
    },
    kr: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.CONTROL, _in, coef).mad(mul, add);
      }
    },
  };

  cc.ugen.specs.Decay = {
    ar: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.init(C.AUDIO, _in, decayTime).mad(mul, add);
      }
    },
    kr: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.init(C.CONTROL, _in, decayTime).mad(mul, add);
      }
    },
  };
  
  cc.ugen.specs.Decay2 = {
    ar: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.init(C.AUDIO, _in, attackTime, decayTime).mad(mul, add);
      }
    },
    kr: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.init(C.CONTROL, _in, attackTime, decayTime).mad(mul, add);
      }
    },
  };
  
  module.exports = {};

});
