define(function(require, exports, module) {
  "use strict";
  
  var ugen = require("./ugen");
  
  ugen.specs.SinOsc = {
    ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
