define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.InRange = {
    $ar: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, lo, hi]);
      }
    },
    $kr: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, lo, hi]);
      }
    },
    $ir: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return cc.ugen.multiNewList(this, [C.SCALAR, _in, lo, hi]);
      }
    }
  };

  cc.ugen.specs.Clip = cc.ugen.specs.InRange;
  cc.ugen.specs.Fold = cc.ugen.specs.InRange;
  cc.ugen.specs.Wrap = cc.ugen.specs.InRange;

  var linlin_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    var scale  = (dsthi.__sub__(dstlo)).__div__(srchi.__sub__(srclo));
    var offset = dstlo.__sub__(scale.__mul__(srclo));
    return cc.createMulAdd(_in, scale, offset);
  };
  
  cc.ugen.specs.LinLin = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    }
  };
  
  var linexp_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.pow(dsthi / dstlo, (_in-srclo)/(srchi-srclo)) * dstlo
    return dsthi.__div__(dstlo).pow(
      (_in.__sub__(srclo)).__div__(srchi.__sub__(srclo))
    ).__mul__(dstlo);
  };
  
  cc.ugen.specs.LinExp = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    }
  };

  var explin_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.log(_in/srclo) / Math.log(srchi/srclo) * (dsthi-dstlo) + dstlo
    return _in.__div__(srclo).log().__div__(
      srchi.__div__(srclo).log()
    ).__mul__(
      dsthi.__sub__(dstlo)
    ).__add__(dstlo);
  };
  
  cc.ugen.specs.ExpLin = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    }
  };

  var expexp_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.pow(dsthi/dstlo, Math.log(_in/srclo) / Math.log(srchi-srclo)) * dstlo
    return dsthi.__div__(dstlo).pow(
      _in.__div__(srclo).log().__div__(
        srchi.__div__(srclo).log()
      )
    ).__mul__(dstlo);
  };
  
  cc.ugen.specs.ExpExp = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    }
  };
  
  module.exports = {};

});
