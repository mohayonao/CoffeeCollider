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

  cc.ugen.specs.LinLin = {
    ar: {
      defaults: "in,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        var scale  = (dsthi.__sub__(dstlo)).__div__(srchi.__sub__(srclo));
        var offset = dstlo.__sub__(scale.__mul__(srclo));
        return cc.createMulAdd(_in, scale, offset);
      }
    },
    kr: {
      defaults: "in,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        var scale  = (dsthi.__sub__(dstlo)).__div__(srchi.__sub__(srclo));
        var offset = dstlo.__sub__(scale.__mul__(srclo));
        return cc.createMulAdd(_in, scale, offset);
      }
    }
  };
  
  cc.ugen.specs.LinExp = {
    ar: {
      defaults: "in,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        return this.init(C.AUDIO, _in, srclo, srchi, dstlo, dsthi);
      }
    },
    kr: {
      defaults: "in,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        return this.init(C.CONTROL, _in, srclo, srchi, dstlo, dsthi);
      }
    }
  };
  
  module.exports = {};

});
