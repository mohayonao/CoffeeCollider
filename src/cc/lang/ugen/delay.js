define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");

  cc.ugen.specs.Delay1 = {
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.Delay2 = cc.ugen.specs.Delay1;
  
  cc.ugen.specs.DelayN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, maxdelaytime, delaytime]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, maxdelaytime, delaytime]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.DelayL = cc.ugen.specs.DelayN;
  cc.ugen.specs.DelayC = cc.ugen.specs.DelayN;
  
  cc.ugen.specs.CombN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, maxdelaytime, delaytime, decaytime]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, maxdelaytime, delaytime, decaytime]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.CombL = cc.ugen.specs.CombN;
  cc.ugen.specs.CombC = cc.ugen.specs.CombN;

  cc.ugen.specs.AllpassN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, maxdelaytime, delaytime, decaytime]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, maxdelaytime, delaytime, decaytime]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.AllpassL = cc.ugen.specs.AllpassN;
  cc.ugen.specs.AllpassC = cc.ugen.specs.AllpassN;
  
  module.exports = {};

});
