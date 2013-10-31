define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  var iComb = {
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
  
  
  module.exports = {
    exports: function() {
      cc.registerUGen("CombN", iComb);
      cc.registerUGen("CombL", iComb);
      cc.registerUGen("CombC", iComb);
    }
  };

});
