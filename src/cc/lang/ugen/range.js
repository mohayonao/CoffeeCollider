define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.InRange = {
    ar: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.init(C.AUDIO, _in, lo, hi);
      }
    },
    kr: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.init(C.CONTROL, _in, lo, hi);
      }
    },
    ir: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.init(C.SCALAR, _in, lo, hi);
      }
    }
  };

  cc.ugen.specs.Clip = cc.ugen.specs.InRange;
  cc.ugen.specs.Fold = cc.ugen.specs.InRange;
  cc.ugen.specs.Wrap = cc.ugen.specs.InRange;
  
  module.exports = {};

});
