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
    kr: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.init(C.CONTROL).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.PinkNoise = cc.ugen.specs.WhiteNoise;

  cc.ugen.specs.Dust = {
    ar: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.init(C.AUDIO, density).madd(mul, add);
      }
    },
    kr: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.init(C.CONTROL, density).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Dust2 = cc.ugen.specs.Dust;

  cc.ugen.specs.LFNoise0 = {
    ar: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.init(C.AUDIO, freq).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.init(C.CONTROL, freq).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.LFNoise1 = cc.ugen.specs.LFNoise0;
  cc.ugen.specs.LFNoise2 = cc.ugen.specs.LFNoise0;
  cc.ugen.specs.LFClipNoise = cc.ugen.specs.LFNoise0;
  
  module.exports = {};

});
