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

  ugen.specs.SinOscFB = {
    ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(C.AUDIO, freq, feedback).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(C.CONTROL, freq, feedback).madd(mul, add);
      }
    }
  };
  
  ugen.specs.LFSaw = {
    ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(C.AUDIO, freq, iphase).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(C.CONTROL, freq, iphase).madd(mul, add);
      }
    }
  };

  ugen.specs.LFPar = ugen.specs.LFSaw;
  ugen.specs.LFCub = ugen.specs.LFSaw;
  ugen.specs.LFTri = ugen.specs.LFSaw;

  ugen.specs.LFPulse = {
    ar: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.init(C.AUDIO, freq, iphase, width).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.init(C.CONTROL, freq, iphase, width).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
