define(function(require, exports, module) {
  "use strict";

  var ugen = require("./ugen");
  
  ugen.specs.RLPF = {
    ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  ugen.specs.RHPF = ugen.specs.RLPF;
  
  module.exports = {};

});
