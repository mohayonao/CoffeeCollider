define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  var nanToZero   = utils.nanToZero;
  var zapgremlins = utils.zapgremlins;
  var log001 = Math.log(0.001);
  
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
      nanToZero(out);
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
      if (isNaN(out[0])) {
        out[0] = 0;
      }
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
      nanToZero(out);
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
      if (isNaN(out[0])) {
        out[0] = 0;
      }
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
      next.call(this, 1);
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
