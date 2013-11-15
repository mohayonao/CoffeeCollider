define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

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

  cc.unit.specs.Clip = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        if (this.inRates[2] === C.AUDIO) {
          this.process = next_aa;
        } else {
          this.process = next_ak;
        }
      } else if (this.inRates[2] === C.AUDIO) {
        this.process = next_ka;
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
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var next_hi = this.inputs[2][0];
      var hi = this._hi;
      var i;
      
      if (next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.max(loIn[i], Math.min(inIn[i], hi));
        }
      } else {
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          hi += hi_slope;
          out[i] = Math.max(loIn[i], Math.min(inIn[i], hi));
        }
        this._hi = next_hi;
      }
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var hiIn = this.inputs[2];
      var lo = this._lo;
      var i;
      
      if (next_lo === lo) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.max(lo, Math.min(inIn[i], hiIn[i]));
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          out[i] = Math.max(lo, Math.min(inIn[i], hiIn[i]));
        }
        this._lo = next_lo;
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
  
  cc.unit.specs.Fold = (function() {
    var fold = function(_in, lo, hi) {
      var x, c, range, range2;
      x = _in - lo;
      if (hi <= _in) {
        _in = hi + hi - _in;
        if (lo <= _in) {
          return _in;
        }
      } else if (_in < lo) {
        _in = lo + lo - _in;
        if (_in < hi) {
          return _in;
        }
      } else {
        return _in;
      }
      if (hi === lo) {
        return lo;
      }
      range = hi - lo;
      range2 = range + range;
      c = x - range2 * Math.floor(x / range2);
      if (c >= range) {
        c = range2 - c;
      }
      return c + lo;
    };
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        if (this.inRates[2] === C.AUDIO) {
          this.process = next_aa;
        } else {
          this.process = next_ak;
        }
      } else if (this.inRates[2] === C.AUDIO) {
        this.process = next_ka;
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
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var next_hi = this.inputs[2][0];
      var hi = this._hi;
      var i;
      
      if (next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = fold(inIn[i], loIn[i], hi);
        }
      } else {
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          hi += hi_slope;
          out[i] = fold(inIn[i], loIn[i], hi);
        }
        this._hi = next_hi;
      }
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var hiIn = this.inputs[2];
      var lo = this._lo;
      var i;
      
      if (next_lo === lo) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = fold(inIn[i], lo, hiIn[i]);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          out[i] = fold(inIn[i], lo, hiIn[i]);
        }
        this._lo = next_lo;
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

  cc.unit.specs.Wrap = (function() {
    var wrap = function(_in, lo, hi) {
      if (lo > hi) {
        return wrap(_in, hi, lo);
      }
      var range;
      if (hi <= _in) {
        range = hi - lo;
        _in -= range;
        if (_in < hi) {
          return _in;
        }
      } else if (_in < lo) {
        range = hi - lo;
        _in += range;
        if (_in >= lo) {
          return _in;
        }
      } else {
        return _in;
      }
      if (hi === lo) {
        return lo;
      }
      return _in - range * Math.floor((_in - lo) / range);
    };
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        if (this.inRates[2] === C.AUDIO) {
          this.process = next_aa;
        } else {
          this.process = next_ak;
        }
      } else if (this.inRates[2] === C.AUDIO) {
        this.process = next_ka;
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
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var next_hi = this.inputs[2][0];
      var hi = this._hi;
      var i;
      
      if (next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = wrap(inIn[i], loIn[i], hi);
        }
      } else {
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          hi += hi_slope;
          out[i] = wrap(inIn[i], loIn[i], hi);
        }
        this._hi = next_hi;
      }
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var hiIn = this.inputs[2];
      var lo = this._lo;
      var i;
      
      if (next_lo === lo) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = wrap(inIn[i], lo, hiIn[i]);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          out[i] = wrap(inIn[i], lo, hiIn[i]);
        }
        this._lo = next_lo;
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

  cc.unit.specs.LinExp = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO && this.inRates[2] === C.AUDIO &&
          this.inRates[3] === C.AUDIO && this.inRates[4] === C.AUDIO) {
          this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._srclo = this.inputs[1][0];
      this._srchi = this.inputs[2][0];
      this._dstlo = this.inputs[3][0];
      this._dsthi = this.inputs[4][0];
      this._srcrange = this._srchi - this._srclo;
      this._dstratio = this._dstlo !== 0 ? (this._dsthi / this._dstlo) : 0;
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn    = this.inputs[0];
      var srcloIn = this.inputs[1];
      var srchiIn = this.inputs[2];
      var dstloIn = this.inputs[3];
      var dsthiIn = this.inputs[4];
      var srclo, srchi, dstlo, dsthi;
      for (var i = 0; i < inNumSamples; ++i) {
        srclo = srcloIn[i];
        srchi = srchiIn[i];
        dstlo = dstloIn[i];
        dsthi = dsthiIn[i];
        if (dstlo === 0 ||srchi === srclo) {
          out[i] = 0;
        } else {
          out[i] = Math.pow(dsthi/dstlo, (inIn[i]-srclo)/(srchi-srclo)) * dstlo;
        }
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_srclo = this.inputs[1][0];
      var next_srchi = this.inputs[2][0];
      var next_dstlo = this.inputs[3][0];
      var next_dsthi = this.inputs[4][0];
      var srclo = this._srclo;
      var srchi = this._srchi;
      var dstlo = this._dstlo;
      var dsthi = this._dsthi;
      var srcrange = this._srcrange;
      var dstratio = this._dstratio;
      var i;
      if (next_srclo === srclo && next_srchi === srchi &&
          next_dstlo === dstlo && next_dsthi === dsthi) {
        if (srcrange === 0 || dstlo === 0) {
          for (i = 0; i < inNumSamples; ++i) {
            out[i] = 0;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            out[i] = Math.pow(dstratio, (inIn[i]-srclo)/srcrange) * dstlo;
          }
        }
      } else {
        var next_srcrange = next_srchi - next_srclo;
        var next_dstratio = next_dstlo !== 0 ? (next_dsthi / next_dstlo) : 0;
        var srcrange_slope = (next_srcrange - srcrange);
        var dstratio_slope = (next_dstratio - dstratio);
        var srclo_slope    = (next_srclo    - srclo);
        var dstlo_slope    = (next_dstlo    - dstlo);
        for (i = 0; i < inNumSamples; ++i) {
          srclo    += srclo_slope;
          dstlo    += dstlo_slope;
          srcrange += srcrange_slope;
          dstratio += dstratio_slope;
          if (srcrange === 0 || dstlo === 0) {
            out[i] = 0;
          } else {
            out[i] = Math.pow(dstratio, (inIn[i]-srclo)/srcrange) * dstlo;
          }
        }
        this._srclo = next_srclo;
        this._srchi = next_srchi;
        this._dstlo = next_dstlo;
        this._dsthi = next_dsthi;
        this._srcrange = next_srcrange;
        this._dstratio = next_dstratio;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
