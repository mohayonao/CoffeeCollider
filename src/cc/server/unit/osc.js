define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var table = require("./table");
  
  var twopi = 2 * Math.PI;
  var kSineSize = table.kSineSize;
  var kSineMask = table.kSineMask;
  var gSineWavetable = table.gSineWavetable;
  
  cc.unit.specs.SinOsc = (function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      if (this.inRates[0] === C.AUDIO) {
        if (this.inRates[1] === C.AUDIO) {
          this.process = next_aa;
        } else if (this.inRates[1] === C.CONTROL) {
          this.process = next_ak;
        } else {
          this.process = next_ai;
        }
        this._x = 0;
      } else {
        if (this.inRates[1] === C.AUDIO) {
          this.process = next_ka;
          this._x = 0;
        } else {
          this.process = next_kk;
          this._x = this._phase * this._radtoinc;
        }
      }
      next_kk.call(this, 1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
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
        out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += freqIn[i] * cpstoinc;
      }
      this._x = x;
    };
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
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
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freqIn[i] * cpstoinc;
        }
      } else {
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          phase += phase_slope;
          x += freqIn[i] * cpstoinc;
        }
        this._phase = nextPhase;
      }
      this._x = x;
    };
    var next_ai = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var phase  = this._phase * this._radtoinc;
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + phase;
        index  = (pphase & mask) << 1;
        out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += cpstoinc * freqIn[i];
      }
      this._x = x;
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
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
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope = (nextFreq - freq) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq += freq_slope;
        }
        this._freq = nextFreq;
      }
      this._x = x;
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
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
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope  = (nextFreq  - freq ) * this.rate.slopeFactor;
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
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
  })();

  cc.unit.specs.SinOscFB = (function() {
    var ctor = function() {
      this.process = next_aa;
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      this._freq     = this.inputs[0][0];
      this._feedback = this.inputs[1][0] * this._radtoinc;
      this._y = 0;
      this._x = 0;
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var nextFreq     = this.inputs[0][0];
      var nextFeedback = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var feedback = this._feedback;
      var y = this._y;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq && nextFeedback === feedback) {
        freq     *= cpstoinc;
        feedback *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + feedback * y;
          index  = (pphase & mask) << 1;
          out[i] = y = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope     = (nextFreq     - freq    ) * this.rate.slopeFactor;
        var feedback_slope = (nextFeedback - feedback) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * feedback * y;
          index  = (pphase & mask) << 1;
          out[i] = y = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq     += freq_slope;
          feedback += feedback_slope;
        }
        this._freq     = nextFreq;
        this._feedback = nextFeedback;
      }
      this._y = y;
      this._x = x;
    };
    return ctor;
  })();

  cc.unit.specs.LFSaw = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase    = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase;
        phase += freqIn[i] * cpstoinc;
        if (phase >= 1) {
          phase -= 2;
        } else if (phase <= -1) {
          phase += 2;
        }
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var i;
      if (freq >= 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = phase;
          phase += freq;
          if (phase >= 1) {
            phase -= 2;
          }
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = phase;
          phase += freq;
          if (phase <= -1) {
            phase += 2;
          }
        }
      }
      this._phase = phase;
    };
    
    return ctor;
  })();

  cc.unit.specs.LFPar = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var z, y;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
          y = 1 - z * z;
        } else if (phase < 3) {
          z = phase - 2;
          y = z * z - 1;
        } else {
          phase -= 4;
          z = phase;
          y = 1 - z * z;
        }
        out[i] = y;
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var z, y;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
          y = 1 - z * z;
        } else if (phase < 3) {
          z = phase - 2;
          y = z * z - 1;
        } else {
          phase -= 4;
          z = phase;
          y = 1 - z * z;
        }
        out[i] = y;
        phase += freq;
      }
      this._phase = phase;
    };
    return ctor;
  })();

  cc.unit.specs.LFCub = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0] + 0.5;
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
        } else if (phase < 2) {
          z = 2 - phase;
        } else {
          phase -= 2;
          z = phase;
        }
        out[i] = z * z * (6 - 4 * z) - 1;
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
        } else if (phase < 2) {
          z = 2 - phase;
        } else {
          phase -= 2;
          z = phase;
        }
        out[i] = z * z * (6 - 4 * z) - 1;
        phase += freq;
      }
      this._phase = phase;
    };
    return ctor;
  })();

  cc.unit.specs.LFTri = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freqIn[i] * cpstoinc;
        if (phase >= 3) { phase -= 4; }
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freq;
        if (phase >= 3) { phase -= 4; }
      }
      this._phase = phase;
    };
    return ctor;
  })();

  cc.unit.specs.LFPulse = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this._duty    = this.inputs[2][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var nextDuty = this.inputs[2][0];
      var duty  = this._duty;
      var phase = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase > 1) {
          phase -= 1;
          duty = nextDuty;
          z = duty < 0.5 ? 1 : 0;
        } else {
          z = phase < duty ? 1 : 0;
        }
        out[i] = z;
        phase += freqIn[i] * cpstoinc;
      }
      this._duty  = duty;
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var nextDuty = this.inputs[2][0];
      var duty  = this._duty;
      var phase = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase > 1) {
          phase -= 1;
          duty = nextDuty;
          z = duty < 0.5 ? 1 : 0;
        } else {
          z = phase < duty ? 1 : 0;
        }
        out[i] = z;
        phase += freq;
      }
      this._duty  = duty;
      this._phase = phase;
    };
    return ctor;
  })();
  
  module.exports = {};

});
