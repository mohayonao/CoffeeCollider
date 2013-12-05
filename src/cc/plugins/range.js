define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.InRange = {
    $ar: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(C.AUDIO, _in, lo, hi);
      }
    },
    $kr: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(C.CONTROL, _in, lo, hi);
      }
    },
    $ir: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(C.SCALAR, _in, lo, hi);
      }
    }
  };

  cc.unit.specs.InRange = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        var _in = inIn[i];
        out[i] = (loIn[i] <= _in && _in <= hiIn[i]) ? 1 : 0;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Clip = cc.ugen.specs.InRange;

  cc.unit.specs.Clip = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO && this.inRates[2] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.max(lo, Math.min(inIn[i], hi));
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = Math.max(lo, Math.min(inIn[i], hi));
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Fold = cc.ugen.specs.InRange;

  cc.unit.specs.Fold = (function() {
    var fold = function(val, lo, hi) {
      var x, range1, range2;
      if (hi === lo) {
        return lo;
      }
      if (val >= hi) {
        val = (hi * 2) - val;
        if (val >= lo) {
          return val;
        }
      } else if (val < lo) {
        val = (lo * 2) - val;
        if (val < hi) {
          return val;
        }
      } else {
        return val;
      }
      range1 = hi - lo;
      range2 = range1 * 2;
      x = val - lo;
      x -= range2 * Math.floor(x / range2);
      if (x >= range1) {
        return range2 - x + lo;
      }
      return x + lo;
    };
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO && this.inRates[2] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = fold(inIn[i], lo, hi);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = fold(inIn[i], lo, hi);
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Wrap = cc.ugen.specs.InRange;

  cc.unit.specs.Wrap = (function() {
    var wrap = function(val, lo, hi) {
      if (hi === lo) {
        return lo;
      }
      var range = (hi - lo);
      if (val >= hi) {
        val -= range;
        if (val < hi) {
          return val;
        }
      } else if (val < lo) {
        val += range;
        if (val >= lo) {
          return val;
        }
      } else {
        return val;
      }
      return val - range * Math.floor((val - lo) / range);
    };
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO && this.inRates[2] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = wrap(inIn[i], lo, hi);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = wrap(inIn[i], lo, hi);
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
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
