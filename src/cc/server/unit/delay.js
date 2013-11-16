define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var log001 = Math.log(0.001);
  
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
  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };
  
  cc.unit.specs.Delay1 = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
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
    var next_k = function() {
      this.outputs[0] = this._x1;
      this._x1 = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.unit.specs.Delay2 = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._x1 = this.inputs[0][0];
      this._x2 = this._x1;
      this.process(1);
    };
    var next_a = function(inNumSamples) {
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
    var next_k = function() {
      this.outputs[0] = this._x1;
      this._x1 = this._x2;
      this._x2 = this.inputs[0][0];
    };
    return ctor;
  })();
  
  
  // DelayN/DelayL/DelayC
  var Delay_Ctor = function() {
    this._maxdelaytime = this.inputs[1][0];
    this._delaytime    = this.inputs[2][0];
    this._dlybuf       = 0;

    var delaybufsize = Math.ceil(this._maxdelaytime * this.rate.sampleRate + 1);
    delaybufsize = delaybufsize + this.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    this._fdelaylen = this._idelaylen = delaybufsize;

    this._dlybuf = new Float32Array(delaybufsize);
    this._mask   = delaybufsize - 1;
    
    this._dsamp = calcDelay(this, this._delaytime, 1);
    this._numoutput = 0;
    this._iwrphase  = 0;
  };
  
  cc.unit.specs.DelayN = (function() {
    var ctor = function() {
      Delay_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var mask     = this._mask;
      var irdphase;
      var i;
      if (delaytime === this._delaytime) {
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          
          irdphase = iwrphase - (dsamp|0);
          out[i] = dlybuf[irdphase & mask];
          iwrphase += 1;
        }
      } else {
        var next_dsamp  = calcDelay(this, delaytime, 1);
        var dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          
          dsamp += dsamp_slope;
          irdphase = iwrphase - (dsamp|0);
          out[i] = dlybuf[irdphase & mask];
          iwrphase += 1;
        }
        this._dsamp     = next_dsamp;
        this._delaytime = delaytime;
      }
      if (iwrphase > dlybuf.length) {
        iwrphase -= dlybuf.length;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayL = (function() {
    var ctor = function() {
      Delay_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var mask     = this._mask;
      var frac, irdphase, d1, d2;
      var i;
      if (delaytime === this._delaytime) {
        frac = dsamp - (dsamp|0);
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          irdphase = iwrphase - (dsamp|0);
          d1 = dlybuf[(irdphase  ) & mask];
          d2 = dlybuf[(irdphase-1) & mask];
          out[i] = d1 + frac * (d2 - d1);
          iwrphase += 1;
        }
      } else {
        var next_dsamp  = calcDelay(this, delaytime, 1);
        var dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          
          dsamp += dsamp_slope;
          frac     = dsamp - (dsamp|0);
          irdphase = iwrphase - (dsamp|0);
          d1 = dlybuf[(irdphase  ) & mask];
          d2 = dlybuf[(irdphase-1) & mask];
          out[i] = d1 + frac * (d2 - d1);
          iwrphase += 1;
        }
        this._dsamp     = next_dsamp;
        this._delaytime = delaytime;
      }
      if (iwrphase > dlybuf.length) {
        iwrphase -= dlybuf.length;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayC = (function() {
    var ctor = function() {
      Delay_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var mask     = this._mask;
      var frac, irdphase, d0, d1, d2, d3;
      var i;
      if (delaytime === this._delaytime) {
        frac = dsamp - (dsamp|0);
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          irdphase = iwrphase - (dsamp|0);
          d0 = dlybuf[(irdphase+1) & mask];
          d1 = dlybuf[(irdphase  ) & mask];
          d2 = dlybuf[(irdphase-1) & mask];
          d3 = dlybuf[(irdphase-2) & mask];
          out[i] = cubicinterp(frac, d0, d1, d2, d3);
          iwrphase += 1;
        }
      } else {
        var next_dsamp  = calcDelay(this, delaytime, 1);
        var dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          dlybuf[iwrphase & mask] = inIn[i];
          
          dsamp += dsamp_slope;
          frac     = dsamp - (dsamp|0);
          irdphase = iwrphase - (dsamp|0);
          d0 = dlybuf[(irdphase+1) & mask];
          d1 = dlybuf[(irdphase  ) & mask];
          d2 = dlybuf[(irdphase-1) & mask];
          d3 = dlybuf[(irdphase-2) & mask];
          out[i] = cubicinterp(frac, d0, d1, d2, d3);
          iwrphase += 1;
        }
        this._dsamp     = next_dsamp;
        this._delaytime = delaytime;
      }
      if (iwrphase > dlybuf.length) {
        iwrphase -= dlybuf.length;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();
  
  // CombN/CombL/CombC
  var Comb_Ctor = function() {
    var delaybufsize;
    this._maxdelaytime = this.inputs[1][0];
    this._delaytime    = this.inputs[2][0];
    this._decaytime    = this.inputs[3][0];
    delaybufsize = Math.ceil(this._maxdelaytime * this.rate.sampleRate + 1);
    delaybufsize = delaybufsize + this.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    this._fdelaylen = this._idelaylen = delaybufsize;
    this._dlybuf    = new Float32Array(delaybufsize);
    this._mask      = delaybufsize - 1;
    this._dsamp     = calcDelay(this, this._delaytime, 1);
    this._iwrphase  = 0;
    this._feedbk    = calcFeedback(this._delaytime, this._decaytime);
  };

  cc.unit.specs.CombN = (function() {
    var ctor = function() {
      Comb_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, value;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          value = dlybuf[irdphase & mask];
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();

  cc.unit.specs.CombL = (function() {
    var ctor = function() {
      Comb_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var frac     = dsamp - (dsamp|0);
      var irdphase, value, d1, d2;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          value = d1 + frac * (d2 - d1);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();
  
  cc.unit.specs.CombC = (function() {
    var ctor = function() {
      Comb_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var frac     = dsamp - (dsamp|0);
      var irdphase, value, d0, d1, d2, d3;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          d0 = dlybuf[(irdphase+1)&mask];
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          d3 = dlybuf[(irdphase-2)&mask];
          value = cubicinterp(frac, d0, d1, d2, d3);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();

  // AllpassN/AllpassL/AllpassC
  var Allpass_Ctor = Comb_Ctor;
  
  cc.unit.specs.AllpassN = (function() {
    var ctor = function() {
      Allpass_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, value, dwr;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          value = dlybuf[irdphase & mask];
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value - feedbk * dwr;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();

  cc.unit.specs.AllpassL = (function() {
    var ctor = function() {
      Allpass_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, frac, value, d1, d2, dwr;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          frac     = dsamp - (dsamp|0);
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          value = d1 + frac * (d2 - d1);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value - feedbk * dwr;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();
  
  cc.unit.specs.AllpassC = (function() {
    var ctor = function() {
      Allpass_Ctor.call(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, frac, value, d0, d1, d2, d3, dwr;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dwr = value * feedbk + inIn[i];
            dlybuf[iwrphase & mask] = dwr;
            if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
              dlybuf[iwrphase & mask] = 0;
            }
            out[i] = value - feedbk * dwr;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          frac     = dsamp - (dsamp|0);
          d0 = dlybuf[(irdphase+1)&mask];
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          d3 = dlybuf[(irdphase-2)&mask];
          value = cubicinterp(frac, d0, d1, d2, d3);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          if (Math.abs(dlybuf[iwrphase & mask]) === Infinity) {
            dlybuf[iwrphase & mask] = 0;
          }
          out[i] = value - feedbk * dwr;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };
    return ctor;
  })();
  
  module.exports = {};

});
