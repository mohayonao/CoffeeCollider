define(function(require, exports, module) {
  "use strict";

  var unit = require("./unit");
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

  var feedbackdelay_ctor = function() {
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

  unit.specs.CombN = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
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

  unit.specs.CombL = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
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
  
  unit.specs.CombC = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
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
  
  module.exports = {};

});
