define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  var zapgremlins = utils.zapgremlins;
  var log001 = Math.log(0.001);
  var sqrt2  = Math.sqrt(2);
  
  cc.unit.specs.OnePole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1   = this._b1;
      var y1   = this._y1;
      var next_b1 = Math.max(-1, Math.min(this.inputs[1][0], 1));
      var y0, i;
      if (b1 !== next_b1) {
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        if (b1 > 0 && next_b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i];
            out[i] = y1 = y0 + b1 * (y1 - y0);
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i];
            out[i] = y1 = y0 + b1 * (y1 + y0);
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i];
            out[i] = y1 = (1 - Math.abs(b1)) * y0 + b1 * y1;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i];
            out[i] = y1 = y0 + b1 * (y1 - y0);
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i];
            out[i] = y1 = y0 + b1 * (y1 + y0);
          }
        }
      }
      this._y1 = zapgremlins(y1);
    };
    return ctor;
  })();
  
  cc.unit.specs.OneZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._x1 = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1   = this._b1;
      var x1   = this._x1;
      var next_b1 = Math.max(-1, Math.min(this.inputs[1][0], 1));
      var x0, i;
      if (b1 !== next_b1) {
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        if (b1 >= 0 && next_b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i];
            out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i];
            out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i];
            out[i] = (1 - Math.abs(b1)) * x0 + b1 * x1;
            x1 = x0;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i];
            out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i];
            out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
          }
        }
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.unit.specs.TwoPole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      var tmp_floops  = this.rate.filterLoops;
      var tmp_framain = this.rate.filterRemain;
      this.rate.filterLoops  = 0;
      this.rate.filterRemain = 1;
      next.call(this, 1);
      this.rate.filterLoops  = tmp_floops;
      this.rate.filterRemain = tmp_framain;
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * this.rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * this.rate.filterSlope;
        var b2_slope = (b2_next - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1;
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = y0;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.unit.specs.TwoZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._x1 = 0;
      this._x2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      var tmp_floops  = this.rate.filterLoops;
      var tmp_framain = this.rate.filterRemain;
      this.rate.filterLoops  = 0;
      this.rate.filterRemain = 1;
      next.call(this, 1);
      this.rate.filterLoops  = tmp_floops;
      this.rate.filterRemain = tmp_framain;
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var x0;
      var b1 = this._b1;
      var b2 = this._b2;
      var x1 = this._x1;
      var x2 = this._x2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = -2 * reson * Math.cos(freq * this.rate.radiansPerSample);
        var b2_next = (reson * reson);
        var b1_slope = (b1_next - b1) * this.rate.filterSlope;
        var b2_slope = (b2_next - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          x0 = inIn[j];
          out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j];
          out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j];
          out[j++] = x1 + b1 * x2 + b2 * x0;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1    = b1_next;
        this._b2    = b2_next;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          x0 = inIn[j];
          out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j];
          out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j];
          out[j++] = x1 + b1 * x2 + b2 * x0;
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        x0 = inIn[j];
        out[j++] = x0 + b1 * x1 + b2 * x2;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.unit.specs.APF = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._x1 = 0;
      this._x2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      var tmp_floops  = this.rate.filterLoops;
      var tmp_framain = this.rate.filterRemain;
      this.rate.filterLoops  = 0;
      this.rate.filterRemain = 1;
      next.call(this, 1);
      this.rate.filterLoops  = tmp_floops;
      this.rate.filterRemain = tmp_framain;
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var x0;
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var x1 = this._x1;
      var x2 = this._x2;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq && reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * this.rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * this.rate.filterSlope;
        var b2_slope = (b2_next - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          x0 = inIn[j];
          out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j];
          out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j];
          out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          x0 = inIn[j];
          out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j];
          out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j];
          out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        x0 = inIn[j];
        out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
        y2 = y1;
        y1 = y0;
        x2 = x1;
        x1 = x0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.unit.specs.LPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = Math.max(0.001, this.inputs[1][0]);
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      
      if (freq !== this._freq) {
        var pfreq = freq * this.rate.radiansPerSample * 0.5;
        var C = 1 / Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = -2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 + 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 + 2 * y2 + y0);
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * (y0 + 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = Math.max(0.001, this.inputs[1][0]);
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq) {
        var pfreq = freq * this.rate.radiansPerSample * 0.5;
        var C = 1 / Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        a0 = 1 / (1 + sqrt2C + C2);
        b1 = -2 * (1 - C2) * a0;
        b2 = -(1 - sqrt2C + C2) * a0;
        
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 + 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
        
        this._freq = freq;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 + 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();

  cc.unit.specs.HPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      
      if (freq !== this._freq) {
        var pfreq = freq * this.rate.radiansPerSample * 0.5;
        var C = Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = 2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - 2 * y2 + y0);
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * (y0 - 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq) {
        var pfreq = freq * this.rate.radiansPerSample * 0.5;
        var C = Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        a0 = 1 / (1 + sqrt2C + C2);
        b1 = 2 * (1 - C2) * a0;
        b2 = -(1 - sqrt2C + C2) * a0;
        
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 - 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
        
        this._freq = freq;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 - 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();

  cc.unit.specs.BPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * this.rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_b1 = C * D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._a0   = next_a0;
        this._b1   = next_b1;
        this._b2   = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * this.rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        a0 = 1 / (1 + C);
        b1 = C * D * a0;
        b2 = (1 - C) * a0;
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
        this._freq = freq;
        this._bw   = bw;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = inIn[0] + b1 * y1 + b2 * y2;
        out[0] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.unit.specs.BRF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._a1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var ay;
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var a1 = this._a1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * this.rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = Math.tan(pbw);
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_a1 = -D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var a1_slope = (next_a1 - a1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          ay = a1 * y1;
          y0 = inIn[j] - ay - b2 * y2;
          out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0;
          y2 = inIn[j] - ay - b2 * y1;
          out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2;
          y1 = inIn[j] - ay - b2 * y0;
          out[j++] = a0 * (y1 + y0) + ay;
          a0 += a0_slope;
          a1 += a1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._a0   = next_a0;
        this._a1   = next_a1;
        this._b2   = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          ay = a1 * y1;
          y0 = inIn[j] - ay - b2 * y2;
          out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0;
          y2 = inIn[j] - ay - b2 * y1;
          out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2;
          y1 = inIn[j] - ay - b2 * y0;
          out[j++] = a0 * (y1 + y0) + ay;
        }
      }
      for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
        ay = a1 * y1;
        y0 = inIn[j] - ay - b2 * y2;
        out[j++] = a0 * (y0 + y2) + ay;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var a1 = this._a1;
      var b2 = this._b2;
      var ay;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * this.rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = Math.tan(pbw);
        var D = 2 * Math.cos(pfreq);
        a0 = 1 / (1 + C);
        a1 = -D * a0;
        b2 = (1 - C) * a0;
        ay = a1 * y1;
        y0 = inIn[0] - ay - b2 * y2;
        out[0] = a0 * (y0 + y2) + ay;
        y2 = y1;
        y1 = y0;
        this._freq = freq;
        this._bw   = bw;
        this._a0 = a0;
        this._a1 = a1;
        this._b2 = b2;
      } else {
        ay = a1 * y1;
        y0 = inIn[0] - ay - b2 * y2;
        out[0] = a0 * (y0 + y2) + ay;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.unit.specs.RLPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C - next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1;
          y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C - b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();

  cc.unit.specs.RHPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C + next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C + b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();

  cc.unit.specs.Lag = (function() {
    var ctor = function() {
      if (this.rate.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._lag = undefined;
      this._b1 = 0;
      this._y1 = this.inputs[0][0];
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1 = this._y1;
      var b1 = this._b1;
      var y0, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0 = inIn[i];
          out[i] = y1 = y0 + b1 * (y1 - y0);
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        var b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0 = inIn[i];
          out[i] = y1 = y0 + b1 * (y1 - y0);
        }
      }
      this._y1 = y1;
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var lag = this.inputs[1][0];
      var y1 = this._y1;
      var b1 = this._b1;
      var y0;
      if (lag !== this._lag) {
        this._b1 = b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      y0 = this.inputs[0][0];
      out[0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.unit.specs.Lag2 = (function() {
    var ctor = function() {
      if (this.inRates[1] !== C.SCALAR) {
        this.process = next_k;
      } else {
        if (this.rate.bufLength === 1) {
          this.process = next_1_i;
        } else {
          this.process = next_i;
        }
      }
      this._lag = NaN;
      this._b1 = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      next_k.call(this, 1);
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a, b1_slope, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          out[i] = y1b;
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          out[i] = y1b;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    var next_i = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a, i;
      for (i = 0; i < inNumSamples; ++i) {
        y0a = inIn[i];
        y1a = y0a + b1 * (y1a - y0a);
        y1b = y1a + b1 * (y1b - y1a);
        out[i] = y1b;
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    var next_1_i = function() {
      var out = this.outputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a = this.inputs[0][0];
      y1a = y0a + b1 * (y1a - y0a);
      y1b = y1a + b1 * (y1b - y1a);
      out[0] = y1b;
      this._y1a = y1a;
      this._y1b = y1b;
    };
    return ctor;
  })();

  cc.unit.specs.Lag3 = (function() {
    var ctor = function() {
      if (this.inRates[1] !== C.SCALAR) {
        this.process = next;
      } else {
        if (this.rate.bufLength === 1) {
          this.process = next_1_i;
        } else {
          this.process = next;
        }
      }
      this._lag = NaN;
      this._b1 = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this._y1c = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1 = this._b1;
      var y0a, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          y1c = y1b + b1 * (y1c - y1b);
          out[i] = y1c;
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        var b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          y1c = y1b + b1 * (y1c - y1b);
          out[i] = y1c;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    var next_1_i = function() {
      var out = this.outputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1 = this._b1;
      var y0a = this.inputs[0][0];
      y1a = y0a + b1 * (y1a - y0a);
      y1b = y1a + b1 * (y1b - y1a);
      y1c = y1b + b1 * (y1c - y1b);
      out[0] = y1c;
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    return ctor;
  })();
  
  cc.unit.specs.Ramp = (function() {
    var ctor = function() {
      if (this.rate.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._counter = 1;
      this._level = this.inputs[0][0];
      this._slope = 0;
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var period = this.inputs[1][0];
      var slope = this._slope;
      var level = this._level;
      var counter = this._counter;
      var remain = inNumSamples;
      var sampleRate = this.rate.sampleRate;
      var nsmps, i, j = 0;
      while (remain) {
        nsmps = Math.min(remain, counter);
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          level += slope;
        }
        counter -= nsmps;
        remain  -= nsmps;
        if (counter <= 0){
          counter = (period * sampleRate)|0;
          counter = Math.max(1, counter);
          slope = (inIn[j-1] - level) / counter;
        }
      }
      this._level = level;
      this._slope = slope;
      this._counter = counter;
    };
    var next_1 = function() {
      var out = this.outputs[0];
      out[0] = this._level;
      this._level += this._slope;
      if (--this._counter <= 0) {
        var _in = this.inputs[0][0];
        var period = this.inputs[1][0];
        var counter = (period * this.rate.sampleRate)|0;
        this._counter = counter = Math.max(1, counter);
        this._slope = (_in - this._level) / counter;
      }
    };
    return ctor;
  })();

  cc.unit.specs.LagUD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = undefined;
      this._lagd = undefined;
      this._b1u = 0;
      this._b1d = 0;
      this._y1 = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1 = this._y1;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0 = inIn[i];
          if (y0 > y1) {
            out[i] = y1 = y0 + b1u * (y1 - y0);
          } else {
            out[i] = y1 = y0 + b1d * (y1 - y0);
          }
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0 = inIn[i];
          if (y0 > y1) {
            out[i] = y1 = y0 + b1u * (y1 - y0);
          } else {
            out[i] = y1 = y0 + b1d * (y1 - y0);
          }
        }
      }
      this._y1 = y1;
    };
    return ctor;
  })();

  cc.unit.specs.Lag2UD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = 0;
      this._lagd = 0;
      this._b1u = 0;
      this._b1d = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0a;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          out[i] = y1b;
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          out[i] = y1b;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    return ctor;
  })();
  
  cc.unit.specs.Lag3UD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = 0;
      this._lagd = 0;
      this._b1u = 0;
      this._b1d = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this._y1c = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0a;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          if (y1a > y1b) {
            y1c = y1b + b1u * (y1c - y1b);
          } else {
            y1c = y1b + b1d * (y1c - y1b);
          }
          out[i] = y1c;
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          if (y1a > y1b) {
            y1c = y1b + b1u * (y1c - y1b);
          } else {
            y1c = y1b + b1d * (y1c - y1b);
          }
          out[i] = y1c;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    return ctor;
  })();
  
  module.exports = {};

});
