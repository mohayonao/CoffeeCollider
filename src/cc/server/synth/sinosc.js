define(function(require, exports, module) {
  "use strict";

  var C = require("../fn").constant;
  var unit = require("./unit");
  
  var twopi     = 2 * Math.PI;
  var kSineSize = 8192;
  var kSineMask = kSineSize - 1;
  var kBadValue = new Float32Array([1e20])[0];
  var gSine          = new Float32Array(kSineSize + 1);
  var gInvSine       = new Float32Array(kSineSize + 1);
  var gSineWavetable = new Float32Array(kSineSize * 2);
  (function() {
    var i;
    for (i = 0; i < kSineSize; ++i) {
      var d = Math.sin(twopi * (i / kSineSize));
      gSine[i] = d;
      gInvSine[i] = 1 / d;
    }
    gSine[kSineSize] = gSine[0];
    gInvSine[0] = gInvSine[kSineSize>>1] = gInvSine[kSineSize] = kBadValue;
    var sz = kSineSize, sz2 = sz >> 1;
    for (i = 1; i <= 8; ++i) {
      gInvSine[i] = gInvSine[sz-i] = gInvSine[sz2-i] = gInvSine[sz2+i] = kBadValue;
    }
  })();
  (function() {
    (function(signal, wavetable, inSize) {
      var val1, val2;
      var i, j;
      for (i = j = 0; i < inSize - 1; ++i) {
        val1 = signal[i];
        val2 = signal[i+1];
        wavetable[j++] = 2 * val1 - val2;
        wavetable[j++] = val2 - val1;
      }
      val1 = signal[inSize - 1];
      val2 = signal[0];
      wavetable[j++] = 2 * val1 - val2;
      wavetable[j++] = val2 - val1;
    })(gSine, gSineWavetable, kSineSize);
  })();
  
  var SinOsc = function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      if (this.inRates[0] === C.AUDIO) {
        if (this.inRates[1] === C.AUDIO) {
          this.process = aa;
        } else if (this.inRates[1] === C.CONTROL) {
          this.process = ak;
        } else {
          this.process = ai;
        }
        this._x = 0;
      } else {
        if (this.inRates[1] === C.AUDIO) {
          this.process = ka;
          this._x = 0;
        } else {
          this.process = kk;
          this._x = this._phase * this._radtoinc;
        }
      }
      kk.call(this, 1);
    };
    var aa = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var freqIn  = this.inputs[0];
      var phaseIn = this.inputs[1];
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var radtoinc = this._radtoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + radtoinc * phaseIn[i];
        index  = (pphase & mask) << 1;
        outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += freqIn[i] * cpstoinc;
      }
      this._x = x;
    };
    var ak = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var freqIn    = this.inputs[0];
      var nextPhase = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var phase = this._phase;
      var x = this._x, pphase, index, i;
      if (nextPhase === phase) {
        phase *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freqIn[i] * cpstoinc;
        }
      } else {
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          phase += phase_slope;
          x += freqIn[i] * cpstoinc;
        }
        this._phase = nextPhase;
      }
      this._x = x;
    };
    var ai = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var freqIn = this.inputs[0];
      var phase  = this._phase * this._radtoinc;
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + phase;
        index  = (pphase & mask) << 1;
        outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += cpstoinc * freqIn[i];
      }
      this._x = x;
    };
    var ka = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var nextFreq = this.inputs[0][0];
      var phaseIn = this.inputs[1];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq) {
        freq *= cpstoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope = (nextFreq - freq) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq += freq_slope;
        }
        this._freq = nextFreq;
      }
      this._x = x;
    };
    var kk = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var nextFreq  = this.inputs[0][0];
      var nextPhase = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var phase = this._phase;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq && nextPhase === phase) {
        freq  *= cpstoinc;
        phase *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope  = (nextFreq  - freq ) * this.rate.slopeFactor;
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq  += freq_slope;
          phase += phase_slope;
        }
        this._freq  = nextFreq;
        this._phase = nextPhase;
      }
      this._x = x;
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("SinOsc", SinOsc);
    }
  };

});
