define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var utils = require("./utils");
  var log001 = Math.log(0.001);
  var cubicinterp = utils.cubicinterp;
  
  cc.ugen.specs.Delay1 = {
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

  cc.unit.specs.Delay1 = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._x1 = 0;
      next_1.call(this);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x1 = this._x1;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = x1;
        out[i+1] = inIn[i  ];
        out[i+2] = inIn[i+1];
        out[i+3] = inIn[i+2];
        out[i+4] = inIn[i+3];
        out[i+5] = inIn[i+4];
        out[i+6] = inIn[i+5];
        out[i+7] = inIn[i+6];
        x1 = inIn[i+7];
      }
      this._x1 = x1;
    };
    var next_1 = function() {
      this.outputs[0][0] = this._x1;
      this._x1 = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.Delay2 = cc.ugen.specs.Delay1;

  cc.unit.specs.Delay2 = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._x1 = this._x2 = 0;
      next_1.call(this);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x1 = this._x1;
      var x2 = this._x2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = x1;
        out[i+1] = x2;
        out[i+2] = inIn[i  ];
        out[i+3] = inIn[i+1];
        out[i+4] = inIn[i+2];
        out[i+5] = inIn[i+3];
        out[i+6] = inIn[i+4];
        out[i+7] = inIn[i+5];
        x1 = inIn[i+6];
        x2 = inIn[i+7];
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    var next_1 = function() {
      this.outputs[0][0] = this._x1;
      this._x1 = this._x2;
      this._x2 = this.inputs[0][0];
    };
    return ctor;
  })();

  // util functions
  var calcDelay = function(unit, delaytime, minDelay) {
    return Math.max(minDelay, Math.min(delaytime * unit.rate.sampleRate, unit._fdelaylen));
  };
  var calcFeedback = function(delaytime, decaytime) {
    if (delaytime === 0 || decaytime === 0) {
      return 0;
    }
    if (decaytime > 0) {
      return +Math.exp(log001 * delaytime / +decaytime);
    } else {
      return -Math.exp(log001 * delaytime / -decaytime);
    }
  };
  var perform_N = function(table, mask, phase) {
    return table[phase & mask];
  };
  var perform_L = function(table, mask, phase, frac) {
    var d1 = table[(phase  )&mask];
    var d2 = table[(phase-1)&mask];
    return d1 + frac * (d2 - d1);
  };
  var perform_C = function(table, mask, phase, frac) {
    var d0 = table[(phase+1)&mask];
    var d1 = table[(phase  )&mask];
    var d2 = table[(phase-1)&mask];
    var d3 = table[(phase-2)&mask];
    return cubicinterp(frac, d0, d1, d2, d3);
  };
  
  cc.ugen.specs.DelayN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.multiNew(C.AUDIO, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.multiNew(C.CONTROL, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.DelayL = cc.ugen.specs.DelayN;
  cc.ugen.specs.DelayC = cc.ugen.specs.DelayN;

  // DelayN/DelayL/DelayC
  var delay_ctor = function(unit) {
    unit._maxdelaytime = unit.inputs[1][0];
    unit._delaytime    = unit.inputs[2][0];
    unit._dlybuf       = 0;

    var delaybufsize = Math.ceil(unit._maxdelaytime * unit.rate.sampleRate + 1);
    delaybufsize = delaybufsize + unit.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    unit._fdelaylen = unit._idelaylen = delaybufsize;

    unit._dlybuf = new Float32Array(delaybufsize);
    unit._mask   = delaybufsize - 1;
    
    unit._dsamp = calcDelay(unit, unit._delaytime, 1);
    unit._numoutput = 0;
    unit._iwrphase  = 0;
  };
  var delay_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var mask     = unit._mask;
    var frac, irdphase;
    var i;
    if (delaytime === unit._delaytime) {
      frac = dsamp - (dsamp|0);
      for (i = 0; i < inNumSamples; ++i) {
        dlybuf[iwrphase & mask] = inIn[i];
        irdphase = iwrphase - (dsamp|0);
        out[i] = perform(dlybuf, mask, irdphase, frac);
        iwrphase += 1;
      }
    } else {
      var next_dsamp  = calcDelay(unit, delaytime, 1);
      var dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        dlybuf[iwrphase & mask] = inIn[i];
        dsamp += dsamp_slope;
        frac     = dsamp - (dsamp|0);
        irdphase = iwrphase - (dsamp|0);
        out[i] = perform(dlybuf, mask, irdphase, frac);
        iwrphase += 1;
      }
      unit._dsamp     = next_dsamp;
      unit._delaytime = delaytime;
    }
    if (iwrphase > dlybuf.length) {
      iwrphase -= dlybuf.length;
    }
    unit._iwrphase = iwrphase;
  };
  
  cc.unit.specs.DelayN = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayL = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayC = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();
  
  cc.ugen.specs.CombN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(C.AUDIO, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(C.CONTROL, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.CombL = cc.ugen.specs.CombN;
  cc.ugen.specs.CombC = cc.ugen.specs.CombN;

  // CombN/CombL/CombC
  var comb_ctor = function(unit) {
    var delaybufsize;
    unit._maxdelaytime = unit.inputs[1][0];
    unit._delaytime    = unit.inputs[2][0];
    unit._decaytime    = unit.inputs[3][0];
    delaybufsize = Math.ceil(unit._maxdelaytime * unit.rate.sampleRate + 1);
    delaybufsize = delaybufsize + unit.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    unit._fdelaylen = unit._idelaylen = delaybufsize;
    unit._dlybuf    = new Float32Array(delaybufsize);
    unit._mask      = delaybufsize - 1;
    unit._dsamp     = calcDelay(unit, unit._delaytime, 1);
    unit._iwrphase  = 0;
    unit._feedbk    = calcFeedback(unit._delaytime, unit._decaytime);
  };
  var comb_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var decaytime = unit.inputs[3][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var feedbk   = unit._feedbk;
    var mask     = unit._mask;
    var frac     = dsamp - (dsamp|0);
    var irdphase, value;
    var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
    var i;
    if (delaytime === unit._delaytime) {
      irdphase = iwrphase - (dsamp|0);
      if (decaytime === unit._decaytime) {
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          irdphase++;
          iwrphase++;
        }
      } else {
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        unit._feedbk = next_feedbk;
        unit._decaytime = decaytime;
      }
    } else {
      next_dsamp  = calcDelay(unit, delaytime, 1);
      dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      next_feedbk  = calcFeedback(delaytime, decaytime);
      feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        irdphase = iwrphase - (dsamp|0);
        value = perform(dlybuf, mask, irdphase, frac);
        dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
        out[i] = value;
        dsamp  += dsamp_slope;
        feedbk += feedbk_slope;
        irdphase++;
        iwrphase++;
      }
      unit._feedbk = feedbk;
      unit._dsamp  = dsamp;
      unit._delaytime = delaytime;
      unit._decaytime = decaytime;
    }
    unit._iwrphase = iwrphase;
  };

  cc.unit.specs.CombN = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.CombL = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.CombC = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();

  cc.ugen.specs.AllpassN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(C.AUDIO, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(C.CONTROL, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.AllpassL = cc.ugen.specs.AllpassN;
  cc.ugen.specs.AllpassC = cc.ugen.specs.AllpassN;

  // AllpassN/AllpassL/AllpassC
  var allpass_ctor = comb_ctor;
  var allpass_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var decaytime = unit.inputs[3][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var feedbk   = unit._feedbk;
    var mask     = unit._mask;
    var irdphase, frac, value, dwr;
    var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
    var i;
    if (delaytime === unit._delaytime) {
      irdphase = iwrphase - (dsamp|0);
      frac     = dsamp - (dsamp|0);
      if (decaytime === unit._decaytime) {
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          out[i] = value - feedbk * dwr;
          irdphase++;
          iwrphase++;
        }
      } else {
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          out[i] = value - feedbk * dwr;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        unit._feedbk = next_feedbk;
        unit._decaytime = decaytime;
      }
    } else {
      next_dsamp  = calcDelay(unit, delaytime, 1);
      dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      next_feedbk  = calcFeedback(delaytime, decaytime);
      feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        value = perform(dlybuf, mask, irdphase, frac);
        dwr = value * feedbk + inIn[i];
        dlybuf[iwrphase & mask] = dwr;
        out[i] = value - feedbk * dwr;
        dsamp  += dsamp_slope;
        feedbk += feedbk_slope;
        irdphase++;
        iwrphase++;
      }
      unit._feedbk = feedbk;
      unit._dsamp  = dsamp;
      unit._delaytime = delaytime;
      unit._decaytime = decaytime;
    }
    unit._iwrphase = iwrphase;
  };
  
  cc.unit.specs.AllpassN = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.AllpassL = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.AllpassC = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();
  
  module.exports = {};

});
