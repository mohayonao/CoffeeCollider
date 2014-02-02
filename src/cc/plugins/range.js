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
  
  cc.ugen.specs.LinLin = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        return this.multiNew(C.AUDIO, _in, srclo, srchi, dstlo, dsthi);
      }
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        return this.multiNew(C.CONTROL, _in, srclo, srchi, dstlo, dsthi);
      }

    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: function(_in, srclo, srchi, dstlo, dsthi) {
        return this.multiNew(C.SCALAR, _in, srclo, srchi, dstlo, dsthi);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.LinLin = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_1;
      }
      this._srclo = 0;
      this._srchi = 0;
      this._dstlo = 0;
      this._dsthi = 0;
      this._scale  = 1;
      this._offset = 0;
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var next_srclo = this.inputs[1][0];
      var next_srchi = this.inputs[2][0];
      var next_dstlo = this.inputs[3][0];
      var next_dsthi = this.inputs[4][0];
      var srclo = this._srclo;
      var srchi = this._srchi;
      var dstlo = this._dstlo;
      var dsthi = this._dsthi;
      var scale = this._scale;
      var offset = this._offset;
      var i;
      if (srclo !== next_srclo || srchi !== next_srchi ||
          dstlo !== next_dstlo || dsthi !== next_dsthi) {
        var next_scale  = ((next_dsthi - next_dstlo) / (next_srchi - next_srclo)) || 0;
        var next_offset = next_dstlo - (next_scale * next_srclo);
        var scale_slope  = (next_scale  - scale ) * this.rate.slopeFactor;
        var offset_slope = (next_offset - offset) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = inIn[i] * scale + offset;
          scale  += scale_slope;
          offset += offset_slope;
        }
        this._srclo = next_srclo;
        this._srchi = next_srchi;
        this._dstlo = next_dstlo;
        this._dsthi = next_dsthi;
        this._scale  = next_scale;
        this._offset = next_offset;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = inIn[i] * scale + offset;
        }
      }
    };
    var next_1 = function() {
      var _in   = this.inputs[0][0];
      var srclo = this.inputs[1][0];
      var srchi = this.inputs[2][0];
      var dstlo = this.inputs[3][0];
      var dsthi = this.inputs[4][0];
      if (this._srclo !== srclo || this._srchi !== srchi ||
          this._dstlo !== dstlo || this._dsthi !== dsthi) {
        this._srclo = srclo;
        this._srchi = srchi;
        this._dstlo = dstlo;
        this._dsthi = dsthi;
        this._scale  = ((dsthi - dstlo) / (srchi - srclo)) || 0;
        this._offset = dstlo - (this._scale * srclo);
      }
      this.outputs[0][0] = _in * this._scale + this._offset;
    };
    return ctor;
  })();
  
  
  cc.ugen.specs.LinExp = cc.ugen.specs.LinLin;

  cc.unit.specs.LinExp = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_1;
      }
      this._srclo = 0;
      this._srchi = 0;
      this._dstlo = 0;
      this._dsthi = 0;
      this._x = 0;
      this._y = 0;
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var next_srclo = this.inputs[1][0];
      var next_srchi = this.inputs[2][0];
      var next_dstlo = this.inputs[3][0] || 0.001;
      var next_dsthi = this.inputs[4][0] || 0.001;
      var srclo = this._srclo;
      var srchi = this._srchi;
      var dstlo = this._dstlo;
      var dsthi = this._dsthi;
      var x = this._x;
      var y = this._y;
      var i;
      if (srclo !== next_srclo || srchi !== next_srchi ||
          dstlo !== next_dstlo || dsthi !== next_dsthi) {
        var next_x = dsthi / dstlo;
        var next_y = (srchi - srclo) || 0.001;
        var x_slope = (next_x - x) * this.rate.slopeFactor;
        var y_slope = (next_y - y) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.pow(x, (inIn[i] - srclo) / y) * dstlo;
          x += x_slope;
          y += y_slope;
        }
        this._srclo = next_srclo;
        this._srchi = next_srchi;
        this._dstlo = next_dstlo;
        this._dsthi = next_dsthi;
        this._x = next_x;
        this._y = next_y;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.pow(x, (inIn[i] - srclo) / y) * dstlo;
        }
      }
    };
    var next_1 = function() {
      var _in   = this.inputs[0][0];
      var srclo = this.inputs[1][0];
      var srchi = this.inputs[2][0];
      var dstlo = this.inputs[3][0] || 0.001;
      var dsthi = this.inputs[4][0] || 0.001;
      if (this._srclo !== srclo || this._srchi !== srchi ||
          this._dstlo !== dstlo || this._dsthi !== dsthi) {
        this._srclo = srclo;
        this._srchi = srchi;
        this._dstlo = dstlo;
        this._dsthi = dsthi;
        this._x = dsthi / dstlo;
        this._y = (srchi - srclo) || 0.001;
      }
      this.outputs[0][0] = Math.pow(this._x, (_in - srclo) / this._y) * dstlo;
    };
    return ctor;
  })();
  
  
  cc.ugen.specs.ExpLin = cc.ugen.specs.LinLin;

  cc.unit.specs.ExpLin = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_1;
      }
      this._srclo = 0;
      this._srchi = 0;
      this._dstlo = 0;
      this._dsthi = 0;
      this._x = 0;
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var next_srclo = this.inputs[1][0] || 0.001;
      var next_srchi = this.inputs[2][0] || 0.001;
      var next_dstlo = this.inputs[3][0];
      var next_dsthi = this.inputs[4][0];
      var srclo = this._srclo;
      var srchi = this._srchi;
      var dstlo = this._dstlo;
      var dsthi = this._dsthi;
      var x = this._x;
      var i, _in;
      if (srclo !== next_srclo || srchi !== next_srchi ||
          dstlo !== next_dstlo || dsthi !== next_dsthi) {
        var next_x = Math.log(Math.abs(srchi / srclo));
        var x_slope = (next_x - x) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i] || 0.001;
          out[i] = Math.log(Math.abs(_in / srclo)) / x * (dsthi - dstlo) + dstlo;
          x += x_slope;
        }
        this._srclo = next_srclo;
        this._srchi = next_srchi;
        this._dstlo = next_dstlo;
        this._dsthi = next_dsthi;
        this._x = next_x;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i] || 0.001;
          out[i] = Math.log(Math.abs(_in / srclo)) / x * (dsthi - dstlo) + dstlo;
        }
      }
    };
    var next_1 = function() {
      var _in   = this.inputs[0][0] || 0.001;
      var srclo = this.inputs[1][0] || 0.001;
      var srchi = this.inputs[2][0] || 0.001;
      var dstlo = this.inputs[3][0];
      var dsthi = this.inputs[4][0];
      if (this._srclo !== srclo || this._srchi !== srchi ||
          this._dstlo !== dstlo || this._dsthi !== dsthi) {
        this._srclo = srclo;
        this._srchi = srchi;
        this._dstlo = dstlo;
        this._dsthi = dsthi;
        this._x = Math.log(Math.abs(srchi / srclo));
      }
      this.outputs[0][0] = Math.log(Math.abs(_in / srclo)) / this._x * (dsthi - dstlo) + dstlo;
    };
    return ctor;
  })();
  
  
  cc.ugen.specs.ExpExp = cc.ugen.specs.LinLin;
  
  cc.unit.specs.ExpExp = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_1;
      }
      this._srclo = 0;
      this._srchi = 0;
      this._dstlo = 0;
      this._dsthi = 0;
      this._x = 0;
      this._y = 0;
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var next_srclo = this.inputs[1][0] || 0.001;
      var next_srchi = this.inputs[2][0] || 0.001;
      var next_dstlo = this.inputs[3][0] || 0.001;
      var next_dsthi = this.inputs[4][0] || 0.001;
      var srclo = this._srclo;
      var srchi = this._srchi;
      var dstlo = this._dstlo;
      var dsthi = this._dsthi;
      var x = this._x;
      var y = this._y;
      var i, _in;
      if (srclo !== next_srclo || srchi !== next_srchi ||
          dstlo !== next_dstlo || dsthi !== next_dsthi) {
        var next_x = dsthi / dstlo;
        var next_y = Math.log(Math.abs(srchi / srclo));
        var x_slope = (next_x - x) * this.rate.slopeFactor;
        var y_slope = (next_y - y) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i] || 0.001;
          out[i] = Math.pow(x, Math.log(Math.abs(_in / srclo)) / y) * dstlo;
          x += x_slope;
          y += y_slope;
        }
        this._srclo = next_srclo;
        this._srchi = next_srchi;
        this._dstlo = next_dstlo;
        this._dsthi = next_dsthi;
        this._x = next_x;
        this._y = next_y;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i] || 0.001;
          out[i] = Math.pow(x, Math.log(Math.abs(_in / srclo)) / y) * dstlo;
        }
      }
    };
    var next_1 = function() {
      var _in   = this.inputs[0][0] || 0.001;
      var srclo = this.inputs[1][0] || 0.001;
      var srchi = this.inputs[2][0] || 0.001;
      var dstlo = this.inputs[3][0] || 0.001;
      var dsthi = this.inputs[4][0] || 0.001;
      if (this._srclo !== srclo || this._srchi !== srchi ||
          this._dstlo !== dstlo || this._dsthi !== dsthi) {
        this._srclo = srclo;
        this._srchi = srchi;
        this._dstlo = dstlo;
        this._dsthi = dsthi;
        this._x = dsthi / dstlo;
        this._y = Math.log(Math.abs(srchi / srclo));
      }
      this.outputs[0][0] = Math.pow(this._x, Math.log(Math.abs(_in / srclo)) / this._y) * dstlo;
    };
    return ctor;
  })();
  
  module.exports = {};

});
