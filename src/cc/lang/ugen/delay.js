define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  var Comb = {
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
  cc.ugen.specs.CombN = Comb;
  cc.ugen.specs.CombL = Comb;
  cc.ugen.specs.CombC = Comb;
  
  module.exports = {};

});
