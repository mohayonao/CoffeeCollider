define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var log001 = Math.log(0.001);
  var sqrt2  = Math.sqrt(2);

  var do_next_1 = function(unit, next) {
    var tmp_floops  = unit.rate.filterLoops;
    var tmp_framain = unit.rate.filterRemain;
    unit.rate.filterLoops  = 0;
    unit.rate.filterRemain = 1;
    next.call(unit, 1);
    unit.rate.filterLoops  = tmp_floops;
    unit.rate.filterRemain = tmp_framain;
  };
  
  cc.ugen.specs.Resonz = {
    $ar: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, bwr).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, bwr).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Resonz = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._rq   = 0;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var rq   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || rq !== this._rq) {
        var ffreq = freq * rate.radiansPerSample;
        var B = ffreq * rq;
        var R = 1 - B * 0.5;
        var twoR = 2 * R;
        var R2 = R * R;
        var cost = (twoR * Math.cos(ffreq)) / (1 + R2);
        var b1_next = twoR * cost;
        var b2_next = -R2;
        var a0_next = (1 - R2) * 0.5;
        var filterSlope = rate.filterSlope;
        var a0_slope = (a0_next - a0) * filterSlope;
        var b1_slope = (b1_next - b1) * filterSlope;
        var b2_slope = (b2_next - b2) * filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b1 += b2_slope;
        }
        this._freq = freq;
        this._rq = rq;
        this._a0 = a0_next;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.OnePole = {
    $ar: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.AUDIO, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.CONTROL, _in, coef).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.OnePole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      this.process(1);
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
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 - y0);
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 + y0);
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = (1 - Math.abs(b1)) * y0 + b1 * y1;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 - y0);
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 + y0);
          }
        }
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.OneZero = cc.ugen.specs.OnePole;

  cc.unit.specs.OneZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._x1 = this.inputs[0][0];
      this.process(1);
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
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = (1 - Math.abs(b1)) * x0 + b1 * x1;
            x1 = x0;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
          }
        }
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TwoPole = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, radius).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, radius).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.TwoPole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TwoZero = cc.ugen.specs.TwoPole;

  cc.unit.specs.TwoZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._x1 = 0;
      this._x2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = -2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = (reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j]; out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j]; out[j++] = x1 + b1 * x2 + b2 * x0;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1    = b1_next;
        this._b2    = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j]; out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j]; out[j++] = x1 + b1 * x2 + b2 * x0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.APF = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, radius).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, radius).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

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
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq && reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j]; out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j]; out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j]; out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j]; out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
        y2 = y1;
        y1 = y0;
        x2 = x1;
        x1 = x0;
      }
      this._y1 = y1;
      this._y2 = y2;
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPF = {
    $ar: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq) {
        var pfreq = freq * rate.radiansPerSample * 0.5;
        var C = 1 / Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = -2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 + 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 + 2 * y2 + y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPF = cc.ugen.specs.LPF;

  cc.unit.specs.HPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq) {
        var pfreq = freq * rate.radiansPerSample * 0.5;
        var C = Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = 2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - 2 * y2 + y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.BPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_b1 = C * D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
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
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BRF = cc.ugen.specs.BPF;

  cc.unit.specs.BRF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._a1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = Math.tan(pbw);
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_a1 = -D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var a1_slope = (next_a1 - a1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0; y2 = inIn[j] - ay - b2 * y1; out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2; y1 = inIn[j] - ay - b2 * y0; out[j++] = a0 * (y1 + y0) + ay;
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
        for (i = rate.filterLoops; i--; ) {
          ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0; y2 = inIn[j] - ay - b2 * y1; out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2; y1 = inIn[j] - ay - b2 * y0; out[j++] = a0 * (y1 + y0) + ay;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();

  cc.ugen.specs.LeakDC = {
    $ar: {
      defaults: "in=0,coef=0.995,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.AUDIO, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=0.995,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.CONTROL, _in, coef).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LeakDC = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        if (this.inRates[1] === C.SCALAR) {
          this.process = next_i;
        } else {
          this.process = next;
        }
      }
      this._b1 = 0;
      this._x1 = this.inputs[0][0];
      this._y1 = 0;
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var _in = this.inputs[0];
      var b1  = this._b1;
      var b1_next = this.inputs[1][0];
      var y1 = this._y1;
      var x1 = this._x1;
      var x0, b1_slope;
      var i;
      
      if (b1 === b1_next) {
        for (i = 0; i < inNumSamples; ++i) {
          x0 = _in[i];
          out[i] = y1 = x0 - x1 + b1 * y1;
          x1 = x0;
        }
      } else {
        b1_slope = (b1_next - b1) * this.rate.filterSlope;
        for (i = 0; i < inNumSamples; ++i) {
          x0 = _in[i];
          out[i] = y1 = x0 - x1 + b1 * y1;
          x1 = x0;
          b1 += b1_slope;
        }
        this._b1 = b1_next;
      }
      this._x1 = x1;
      this._y1 = y1;
    };
    var next_i = function(inNumSamples) {
      var out = this.outputs[0];
      var _in = this.inputs[0];
      var b1  = this._b1;
      var y1  = this._y1;
      var x1  = this._x1;
      var x0;
      for (var i = 0; i < inNumSamples; ++i) {
        x0 = _in[i];
        out[i] = y1 = x0 - x1 + b1 * y1;
        x1 = x0;
      }
      this._x1 = x1;
      this._y1 = y1;
    };
    var next_1 = function() {
      var b1 = this._b1 = this.inputs[1][0];
      var y1 = this._y1;
      var x1 = this._x1;
      var x0 = this.inputs[0][0];
      this.outputs[0][0] = y1 = x0 - x1 + b1 * y1;
      x1 = x0;
      this._x1 = x1;
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RLPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.RLPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C - next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 + 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 + 2.0 * y2 + y0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;

  cc.unit.specs.RHPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
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
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C + next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 - 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 - 2.0 * y2 + y0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
        
        y2 = y1; y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.MidEQ = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, rq, db).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, rq, db).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.MidEQ = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      this._db   = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var db   = this.inputs[3][0];
      var y0, zin;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw || db !== this._db) {
        var amp = Math.pow(10, db * 0.05) - 1;
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_b1 = C * D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        next_a0 *= amp;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          zin = inIn[j]; y0 = zin + b1 * y1 + b2 * y2; out[j++] = zin + a0 * (y0 - y2);
          zin = inIn[j]; y2 = zin + b1 * y0 + b2 * y1; out[j++] = zin + a0 * (y2 - y1);
          zin = inIn[j]; y1 = zin + b1 * y2 + b2 * y0; out[j++] = zin + a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._db   = db;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          zin = inIn[j]; y0 = zin + b1 * y1 + b2 * y2; out[j++] = zin + a0 * (y0 - y2);
          zin = inIn[j]; y2 = zin + b1 * y0 + b2 * y1; out[j++] = zin + a0 * (y2 - y1);
          zin = inIn[j]; y1 = zin + b1 * y2 + b2 * y0; out[j++] = zin + a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        zin = inIn[j];
        y0 = zin + b1 * y1 + b2 * y2;
        out[j++] = zin + a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPZ1 = {
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(C.AUDIO, _in).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(C.CONTROL, _in).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LPZ1 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = 0.5 * (x0 + x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPZ1  = cc.ugen.specs.LPZ1;

  cc.unit.specs.HPZ1 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = 0.5 * (x0 - x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Slope = cc.ugen.specs.LPZ1;

  cc.unit.specs.Slope = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var sr = this.rate.sampleRate;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = sr * (x0 - x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.LPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 + 2 * x1 + x2) * 0.25;
        x2 = inIn[j]; out[j++] = (x2 + 2 * x0 + x1) * 0.25;
        x1 = inIn[j]; out[j++] = (x1 + 2 * x2 + x0) * 0.25;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 + 2 * x1 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.HPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 - 2 * x1 + x2) * 0.25;
        x2 = inIn[j]; out[j++] = (x2 - 2 * x0 + x1) * 0.25;
        x1 = inIn[j]; out[j++] = (x1 - 2 * x2 + x0) * 0.25;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 - 2 * x1 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.BPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 - x2) * 0.5;
        x2 = inIn[j]; out[j++] = (x2 - x1) * 0.5;
        x1 = inIn[j]; out[j++] = (x1 - x0) * 0.5;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 - x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BRZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.BRZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 + x2) * 0.5;
        x2 = inIn[j]; out[j++] = (x2 + x1) * 0.5;
        x1 = inIn[j]; out[j++] = (x1 + x0) * 0.5;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Changed = {
    $ar: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.ar(_in).abs().gt(threshold);
      }
    },
    $kr: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.kr(_in).abs().gt(threshold);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.Lag = {
    $ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.multiNew(C.AUDIO, _in, lagTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.multiNew(C.CONTROL, _in, lagTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

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
  
  cc.ugen.specs.Lag2 = cc.ugen.specs.Lag;

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
  
  cc.ugen.specs.Lag3 = cc.ugen.specs.Lag;

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
  
  cc.ugen.specs.Ramp = cc.ugen.specs.Lag;

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
  
  cc.ugen.specs.LagUD = {
    $ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.multiNew(C.AUDIO, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.multiNew(C.CONTROL, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LagUD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = undefined;
      this._lagd = undefined;
      this._b1u = 0;
      this._b1d = 0;
      this._y1 = this.inputs[0][0];
      this.process(1);
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
  
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;

  cc.unit.specs.Lag2UD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = 0;
      this._lagd = 0;
      this._b1u = 0;
      this._b1d = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this.process(1);
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
  
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;

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
      this.process(1);
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
  
  cc.ugen.specs.VarLag = {
    $ar: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.multiNew(C.AUDIO, _in, time, curvature, warp, start).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.multiNew(C.CONTROL, _in, time, curvature, warp, start).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.VarLag = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      var lagTime = this.inputs[1][0];
      var counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
      this._level   = this.inputs[2][0];
      this._counter = counter;
      this._in      = this.inputs[0][0];
      this._slope   = (this._in - this._level) / counter;
      this._lagTime = lagTime;
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var _in = this.inputs[0][0];
      var lagTime = this.inputs[1][0];
      var slope   = this._slope;
      var level   = this._level;
      var counter = this._counter;
      var i, scaleFactor;
      if (_in !== this._in) {
        this._counter = counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
        this._slope   = slope   = (_in - this._in) / counter;
        this._in      = _in;
        this._lagTime = lagTime;
      } else if (lagTime !== this._lagTime) {
        scaleFactor = lagTime / this._lagTime;
        this._counter = counter = Math.max(1, (this._counter * scaleFactor)|0);
        this._slope   = slope   = (this._slope / scaleFactor) || 0;
        this._lagTime = lagTime;
      }
      _in = this._in;
      if (counter > 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
          if (counter > 0) {
            level += slope;
            counter -= 1;
          } else {
            level = _in;
          }
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
        }
      }
      this._level   = level;
      this._slope   = slope;
      this._counter = counter;
    };
    var next_1 = function() {
      var _in  = this.inputs[0][0];
      var lagTime = this.inputs[1][0];
      var counter = this._counter;
      var scaleFactor;
      if (_in !== this._in) {
        this._counter = counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
        this._slope   = (_in - this._level) / counter;
        this._in      = _in;
        this._lagTime = lagTime;
      } else if (lagTime !== this._lagTime) {
        if (counter !== 0) {
          scaleFactor = lagTime / this._lagTime;
          this._counter = counter = Math.max(1, (this._counter * scaleFactor)|0);
          this._slope   = this._slope / scaleFactor;
        }
        this._lagTime = lagTime;
      }
      this.outputs[0][0] = this._level;
      if (this._counter > 0) {
        this._level += this._slope;
        this._counter -= 1;
      } else {
        this._level = this._in;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Slew = {
    $ar: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.multiNew(C.AUDIO, _in, up, dn).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.multiNew(C.CONTROL, _in, up, dn).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Slew = (function() {
    var ctor = function() {
      this.process = next;
      this._level = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var sampleDur = this.rate.sampleDur;
      var upf = +this.inputs[1][0] * sampleDur;
      var dnf = -this.inputs[2][0] * sampleDur;
      var level = this._level;
      var slope;
      for (var i = 0; i < inNumSamples; ++i) {
        slope = inIn[i] - level;
        level += Math.max(dnf, Math.min(slope, upf));
        out[i] = level;
      }
      this._level = level;
    };
    return ctor;
  })();

  cc.ugen.specs.FOS = {
    $ar: {
      defaults: "in=0,a0=0,a1=0,b1=0,mul=1,add=0",
      ctor: function(_in, a0, a1, b1, mul, add) {
        return this.multiNew(C.AUDIO, _in, a0, a1, b1).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,a0=0,a1=0,b1=0,mul=1,add=0",
      ctor: function(_in, a0, a1, b1, mul, add) {
        return this.multiNew(C.CONTROL, _in, a0, a1, b1).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.FOS = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        var inRates = this.inRates;
        if (inRates[1] === C.AUDIO && inRates[2] === C.AUDIO && inRates[3] === C.AUDIO) {
          this.process = next_a;
        } else {
          this.process = next_k;
        }
      }
      this._y1 = 0;
      this._a0 = 0;
      this._a1 = 0;
      this._b1 = 0;
      next_1.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var a0In = this.inputs[1];
      var a1In = this.inputs[2];
      var b1In = this.inputs[3];
      var y1 = this._y1, y0;
      for (var i = 0; i < inNumSamples; ++i) {
        y0 = inIn[i] + b1In[i] * y1;
        out[i] = a0In[i] * y0 + a1In[i] * y1;
        y1 = y0;
      }
      this._y1 = y1;
    };
    var next_1 = function() {
      var _in = this.inputs[0][0];
      var a0  = this.inputs[1][0];
      var a1  = this.inputs[2][0];
      var b1  = this.inputs[3][0];
      var y1  = this._y1;
      var y0  = _in + b1 * y1;
      this.outputs[0][0] = a0 * y0 + a1 * y1;
      y1 = y0;
      this._y1 = y1;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_a0 = this.inputs[1][0];
      var next_a1 = this.inputs[2][0];
      var next_b1 = this.inputs[3][0];
      var filterSlope = this.rate.filterSlope;
      var y0;
      var y1 = this._y1;
      var a0 = this._a0;
      var a1 = this._a1;
      var b1 = this._b1;
      var a0_slope = (next_a0 - a0) * filterSlope;
      var a1_slope = (next_a1 - a1) * filterSlope;
      var b1_slope = (next_b1 - b1) * filterSlope;
      for (var i = 0; i < inNumSamples; ++i) {
        y0 = inIn[i] + b1 * y1;
        out[i] = a0 * y0 + a1 * y1;
        y1 = y0;
        
        a0 += a0_slope;
        a1 += a1_slope;
        b1 += b1_slope;
      }
      this._y1 = y1;
      this._a0 = a0;
      this._a1 = a1;
      this._b1 = b1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.SOS = {
    $ar: {
      defaults: "in=0,a0=0,a1=0,a2=0,b1=0,b2=0,mul=1,add=0",
      ctor: function(_in, a0, a1, a2, b1, b2, mul, add) {
        return this.multiNew(C.AUDIO, _in, a0, a1, a2, b1, b2).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,a0=0,a1=0,a2=0,b1=0,b2=0,mul=1,add=0",
      ctor: function(_in, a0, a1, a2, b1, b2, mul, add) {
        return this.multiNew(C.CONTROL, _in, a0, a1, a2, b1, b2).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.SOS = (function() {
    var ctor = function() {
      var inRates = this.inRates;
      if (this.bufLength !== 1) {
        if (inRates[1] === C.AUDIO && inRates[2] === C.AUDIO && inRates[3] === C.AUDIO && inRates[4] === C.AUDIO && inRates[5] === C.AUDIO) {
          this.process = next_a;
        } else if (inRates[1] === C.SCALAR && inRates[2] === C.SCALAR && inRates[3] === C.SCALAR && inRates[4] === C.SCALAR && inRates[5] === C.SCALAR) {
          this.process = next_i;
        } else {
          this.process = next_k;
        }
      } else {
        this.process = next_1;
      }
      this._y1 = 0;
      this._y2 = 0;
      this._a0 = this.inputs[1][0];
      this._a1 = this.inputs[2][0];
      this._a2 = this.inputs[3][0];
      this._b1 = this.inputs[4][0];
      this._b2 = this.inputs[5][0];
      next_1.call(this, 1);
    };
    var next_a = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var a0In = this.inputs[1];
      var a1In = this.inputs[2];
      var a2In = this.inputs[3];
      var b1In = this.inputs[4];
      var b2In = this.inputs[5];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var rate = this.rate;
      var i, j = 0;

      for (i = rate.filterLoops; i--; ) {
        y0 = inIn[j] + b1In[j] * y1 + b2In[j] * y2;
        out[j] = a0In[j] * y0 + a1In[j] * y1 + a2In[j] * y2;
        j++;
        
        y2 = inIn[j] + b1In[j] * y0 + b2In[j] * y1;
        out[j] = a0In[j] * y2 + a1In[j] * y0 + a2In[j] * y1;
        j++;

        y1 = inIn[j] + b1In[j] * y2 + b2In[j] * y0;
        out[j] = a0In[j] * y1 + a1In[j] * y2 + a2In[j] * y0;
        j++;
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1In[j] * y1 + b2In[j] * y2;
        out[j] = a0In[j] * y0 + a1In[j] * y1 + a2In[j] * y2;
        j++;
        y2 = y1;
        y1 = y0;
      }

      this._y1 = y1;
      this._y2 = y2;
    };
    var next_k = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_a0 = this.inputs[1][0];
      var next_a1 = this.inputs[2][0];
      var next_a2 = this.inputs[3][0];
      var next_b1 = this.inputs[4][0];
      var next_b2 = this.inputs[5][0];
      
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var a1 = this._a1;
      var a2 = this._a2;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;

      var a0_slope = (next_a0 - a0) * rate.filterSlope;
      var a1_slope = (next_a1 - a1) * rate.filterSlope;
      var a2_slope = (next_a2 - a2) * rate.filterSlope;
      var b1_slope = (next_b1 - b1) * rate.filterSlope;
      var b2_slope = (next_b2 - b2) * rate.filterSlope;
      
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * y0 + a1 * y1 + a2 * y2;

        y2 = inIn[j] + b1 * y0 + b2 * y1;
        out[j++] = a0 * y2 + a1 * y0 + a2 * y1;
        
        y1 = inIn[j] + b1 * y2 + b2 * y0;
        out[j++] = a0 * y1 + a1 * y2 + a2 * y0;
        
        a0 += a0_slope;
        a1 += a1_slope;
        a2 += a2_slope;
        b1 += b1_slope;
        b2 += b2_slope;
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * y0 + a1 * y1 + a2 * y2;
        y2 = y1;
        y1 = y0;
      }
      this._a0 = a0;
      this._a1 = a1;
      this._a2 = a2;
      this._b1 = b1;
      this._b2 = b2;
      this._y1 = y1;
      this._y2 = y2;
    };
    var next_i = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var a1 = this._a1;
      var a2 = this._a2;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * y0 + a1 * y1 + a2 * y2;

        y2 = inIn[j] + b1 * y0 + b2 * y1;
        out[j++] = a0 * y2 + a1 * y0 + a2 * y1;
        
        y1 = inIn[j] + b1 * y2 + b2 * y0;
        out[j++] = a0 * y1 + a1 * y2 + a2 * y0;
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * y0 + a1 * y1 + a2 * y2;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    var next_1 = function() {
      var _in = this.inputs[0][0];
      var a0  = this.inputs[1][0];
      var a1  = this.inputs[2][0];
      var a2  = this.inputs[3][0];
      var b1  = this.inputs[4][0];
      var b2  = this.inputs[5][0];

      var y0;
      var y1 = this._y1;
      var y2 = this._y2;

      y0 = _in + b1 * y1 + b2 * y2;
      this.outputs[0][0] = a0 * y0 + a1 * y1 + a2 * y2;
      y2 = y1;
      y1 = y0;
      
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Ringz = {
    $ar: {
      defaults: "in=0,freq=440,decaytime=1,mul=1,add=0",
      ctor: function(_in, freq, decaytime, mul, add) {
        return this.multiNew(C.AUDIO, _in, freq, decaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,decaytime=1,mul=1,add=0",
      ctor: function(_in, freq, decaytime, mul, add) {
        return this.multiNew(C.CONTROL, _in, freq, decaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Ringz = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = NaN;
      this._decayTime = 0;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var decayTime = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = 0.5;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      
      if (freq !== this._freq || decayTime !== this._decayTime) {
        var ffreq = freq * rate.radiansPerSample;
        var R = decayTime === 0 ? 0 : Math.exp(log001/(decayTime * rate.sampleRate));
        var twoR = 2 * R;
        var R2 = R * R;
        var cost = (twoR * Math.cos(ffreq)) / (1 + R2);
        var b1_next = twoR * cost;
        var b2_next = -R2;
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - y2);
          
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - y1);
          
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - y0);

          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._decayTime = decayTime;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = a0 * (y0 - y2);
          
          y2 = inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = a0 * (y2 - y1);
          
          y1 = inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.DetectSilence = {
    $ar: {
      defaults: "in=0,amp=0.0001,time=0.1,doneAction=0",
      ctor: function(_in, amp, time, doneAction) {
        return this.multiNew(C.AUDIO, _in, amp, time, doneAction);
      }
    },
    $kr: {
      defaults: "in=0,amp=0.0001,time=0.1,doneAction=0",
      ctor: function(_in, amp, time, doneAction) {
        return this.multiNew(C.CONTROL, _in, amp, time, doneAction);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.DetectSilence = (function() {
    var ctor = function() {
      this.process = next;
      this._thresh = this.inputs[1][0];
      this._endCounter = (this.rate.sampleRate * this.inputs[2][0])|0;
      this._counter    = -1;
    };
    var next = function(inNumSamples) {
      var thresh  = this._thresh;
      var counter = this._counter;
      var val;

      var inIn = this.inputs[0];
      var out  = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        val = Math.abs(inIn[i]);
        if (val > thresh) {
          counter = 0;
          out[i] = 0;
        } else if (counter >= 0) {
          if (++counter >= this._endCounter) {
            this.doneAction(this.inputs[3][0]|0);
            out[i] = 1;
          } else {
            out[i] = 0;
          }
        } else {
          out[i] = 0;
        }
      }
      this._counter = counter;
    };
    return ctor;
  })();
  
  module.exports = {};

});
