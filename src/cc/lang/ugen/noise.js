define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");

  cc.ugen.specs.WhiteNoise = {
    ar: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.init(C.AUDIO).madd(mul, add);
      }
    },
    ak: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.init(C.AUDIO).madd(mul, add);
      }
    },
  };
  
  cc.ugen.specs.PinkNoise = cc.ugen.specs.WhiteNoise;
  
  module.exports = {};

});
