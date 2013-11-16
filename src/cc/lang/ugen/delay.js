define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");

  cc.ugen.specs.Delay1 = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.init(C.AUDIO, _in).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.init(C.CONTROL, _in).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Delay2 = cc.ugen.specs.Delay1;

  cc.ugen.specs.DelayN = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.init(C.AUDIO, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.init(C.CONTROL, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.DelayL = cc.ugen.specs.DelayN;
  cc.ugen.specs.DelayC = cc.ugen.specs.DelayN;
  
  cc.ugen.specs.CombN = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.init(C.AUDIO, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.init(C.AUDIO, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
  };
  cc.ugen.specs.CombL = cc.ugen.specs.CombN;
  cc.ugen.specs.CombC = cc.ugen.specs.CombN;
  
  module.exports = {};

});
