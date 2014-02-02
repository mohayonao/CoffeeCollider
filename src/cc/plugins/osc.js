define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");

  var utils = require("./utils");
  
  var twopi = 2 * Math.PI;
  var kSineSize = utils.kSineSize;
  var kSineMask = utils.kSineMask;
  var kBadValue = utils.kBadValue;
  var gSineWavetable = utils.gSineWavetable;
  var gSine    = utils.gSine;
  var gInvSine = utils.gInvSine;
  var log001 = Math.log(0.001);

  var osc_next_aa = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn  = unit.inputs[unit._freqIndex];
    var phaseIn = unit.inputs[unit._phaseIndex];
    var mask  = unit._mask;
    var table = unit._table;
    var cpstoinc = unit._cpstoinc;
    var radtoinc = unit._radtoinc;
    var x = unit._x, i;
    for (i = 0; i < inNumSamples; ++i) {
      out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
      x += freqIn[i] * cpstoinc;
    }
    unit._x = x;
  };
  var osc_next_ak = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn    = unit.inputs[unit._freqIndex];
    var nextPhase = unit.inputs[unit._phaseIndex][0];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var phase = unit._phase;
    var x = unit._x, i;
    if (nextPhase === phase) {
      phase *= radtoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + phase);
        x += freqIn[i] * cpstoinc;
      }
    } else {
      var phase_slope = (nextPhase - phase) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phase);
        phase += phase_slope;
        x += freqIn[i] * cpstoinc;
      }
      unit._phase = nextPhase;
    }
    unit._x = x;
  };
  var osc_next_ai = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn = unit.inputs[unit._freqIndex];
    var phase  = unit._phase * unit._radtoinc;
    var mask  = unit._mask;
    var table = unit._table;
    var cpstoinc = unit._cpstoinc;
    var x = unit._x, i;
    for (i = 0; i < inNumSamples; ++i) {
      out[i] = calc(table, mask, x + phase);
      x += cpstoinc * freqIn[i];
    }
    unit._x = x;
  };
  var osc_next_ka = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var nextFreq = unit.inputs[unit._freqIndex][0];
    var phaseIn = unit.inputs[unit._phaseIndex];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var freq = unit._freq;
    var x = unit._x, i;
    if (nextFreq === freq) {
      freq *= cpstoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
        x += freq;
      }
    } else {
      var freq_slope = (nextFreq - freq) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
        x += freq * cpstoinc;
        freq += freq_slope;
      }
      unit._freq = nextFreq;
    }
    unit._x = x;
  };
  var osc_next_kk = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var nextFreq  = unit.inputs[unit._freqIndex][0];
    var nextPhase = unit.inputs[unit._phaseIndex][0];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var freq = unit._freq;
    var phase = unit._phase;
    var x = unit._x, i;
    if (nextFreq === freq && nextPhase === phase) {
      freq  *= cpstoinc;
      phase *= radtoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + phase);
        x += freq;
      }
    } else {
      var freq_slope  = (nextFreq  - freq ) * unit.rate.slopeFactor;
      var phase_slope = (nextPhase - phase) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phase);
        x += freq * cpstoinc;
        freq  += freq_slope;
        phase += phase_slope;
      }
      unit._freq  = nextFreq;
      unit._phase = nextPhase;
    }
    unit._x = x;
  };
  var get_table = function(unit, shift) {
    var buffer = unit.world.buffers[unit._bufnumIn[0]|0];
    if (buffer) {
      var samples = buffer.samples;
      if (samples.length) {
        if (unit._table === samples) {
          return true;
        }
        var length  = samples.length;
        var logSize = Math.log(length) / Math.log(2);
        if (logSize === (logSize|0)) {
          length >>= shift;
          unit._radtoinc = length / twopi;
          unit._cpstoinc = length * unit.rate.sampleDur;
          unit._table    = samples;
          unit._mask     = length - 1;
          return true;
        }
      }
    }
    return false;
  };
  
  cc.ugen.specs.Osc = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, bufnum, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, bufnum, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Osc = (function() {
    var ctor = function() {
      this._bufnumIn = this.inputs[0];
      this._freq  = this.inputs[1][0];
      this._phase = this.inputs[2][0];
      this._freqIndex  = 1;
      this._phaseIndex = 2;
      this._radtoinc = 0;
      this._cpstoinc = 0;
      this._mask    = 0;
      this._table   = null;
      this._x = 0;
      switch (this.inRates[0]) {
      case C.AUDIO:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_aa; break;
        case C.CONTROL: this.process = next_ak; break;
        case C.SCALAR : this.process = next_ai; break;
        case C.DEMAND : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_ka; break;
        case C.CONTROL: this.process = next_kk; break;
        case C.SCALAR : this.process = next_kk; break;
        case C.DEMAND : this.process = next_kk; break;
        }
      }
    };
    var wcalc = function(table, mask, pphase) {
      var index = (pphase & mask) << 1;
      return table[index] + (pphase-(pphase|0)) * table[index+1];
    };
    var next_aa = function(inNumSamples) {
      if (get_table(this, 1)) {
        osc_next_aa(this, inNumSamples, wcalc);
      }
    };
    var next_ak = function(inNumSamples) {
      if (get_table(this, 1)) {
        osc_next_ak(this, inNumSamples, wcalc);
      }
    };
    var next_ai = function(inNumSamples) {
      if (get_table(this, 1)) {
        osc_next_ai(this, inNumSamples, wcalc);
      }
    };
    var next_ka = function(inNumSamples) {
      if (get_table(this, 1)) {
        osc_next_ka(this, inNumSamples, wcalc);
      }
    };
    var next_kk = function(inNumSamples) {
      if (get_table(this, 1)) {
        osc_next_kk(this, inNumSamples, wcalc);
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.SinOsc = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SinOsc = (function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._freqIndex  = 0;
      this._phaseIndex = 1;
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      this._x = 0;
      switch (this.inRates[0]) {
      case C.AUDIO:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_aa; break;
        case C.CONTROL: this.process = next_ak; break;
        case C.SCALAR : this.process = next_ai; break;
        case C.DEMAND : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_ka; break;
        case C.CONTROL: this.process = next_kk; break;
        case C.SCALAR : this.process = next_kk; break;
        case C.DEMAND : this.process = next_kk; break;
        }
      }
      osc_next_kk(this, 1, wcalc);
    };
    var wcalc = function(table, mask, pphase) {
      var index = (pphase & mask) << 1;
      return table[index] + (pphase-(pphase|0)) * table[index+1];
    };
    var next_aa = function(inNumSamples) {
      osc_next_aa(this, inNumSamples, wcalc);
    };
    var next_ak = function(inNumSamples) {
      osc_next_ak(this, inNumSamples, wcalc);
    };
    var next_ai = function(inNumSamples) {
      osc_next_ai(this, inNumSamples, wcalc);
    };
    var next_ka = function(inNumSamples) {
      osc_next_ka(this, inNumSamples, wcalc);
    };
    var next_kk = function(inNumSamples) {
      osc_next_kk(this, inNumSamples, wcalc);
    };
    return ctor;
  })();

  cc.ugen.specs.PMOsc = {
    $ar: {
      defaults: "carfreq=0,modfreq=0,pmindex=0,modphase=0,mul=1,add=0",
      ctor: function(carfreq, modfreq, pmindex, modphase, mul, add) {
        var SinOsc = cc.global.SinOsc;
        return SinOsc.ar(carfreq, SinOsc.ar(modfreq, modphase, pmindex), mul, add);
      }
    },
    $kr: {
      defaults: "carfreq=0,modfreq=0,pmindex=0,modphase=0,mul=1,add=0",
      ctor: function(carfreq, modfreq, pmindex, modphase, mul, add) {
        var SinOsc = cc.global.SinOsc;
        return SinOsc.kr(carfreq, SinOsc.kr(modfreq, modphase, pmindex), mul, add);
      }
    }
  };
  
  cc.ugen.specs.SinOscFB = {
    $ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.multiNew(C.AUDIO, freq, feedback).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.multiNew(C.CONTROL, freq, feedback).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SinOscFB = (function() {
    var ctor = function() {
      this.process = next;
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
    var next = function(inNumSamples) {
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
  
  cc.ugen.specs.OscN = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, bufnum, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, bufnum, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.OscN = (function() {
    var ctor = function() {
      this._bufnumIn = this.inputs[0];
      this._freq  = this.inputs[1][0];
      this._phase = this.inputs[2][0];
      this._freqIndex  = 1;
      this._phaseIndex = 2;
      this._radtoinc = 0;
      this._cpstoinc = 0;
      this._mask    = 0;
      this._table   = null;
      this._x = 0;
      
      switch (this.inRates[0]) {
      case C.AUDIO:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_aa; break;
        case C.CONTROL: this.process = next_ak; break;
        case C.SCALAR : this.process = next_ai; break;
        case C.DEMAND : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case C.AUDIO  : this.process = next_ka; break;
        case C.CONTROL: this.process = next_kk; break;
        case C.SCALAR : this.process = next_kk; break;
        case C.DEMAND : this.process = next_kk; break;
        }
      }
    };
    var calc = function(table, mask, pphase) {
      return table[pphase & mask];
    };
    var next_aa = function(inNumSamples) {
      if (get_table(this, 0)) {
        osc_next_aa(this, inNumSamples, calc);
      }
    };
    var next_ak = function(inNumSamples) {
      if (get_table(this, 0)) {
        osc_next_ak(this, inNumSamples, calc);
      }
    };
    var next_ai = function(inNumSamples) {
      if (get_table(this, 0)) {
        osc_next_ai(this, inNumSamples, calc);
      }
    };
    var next_ka = function(inNumSamples) {
      if (get_table(this, 0)) {
        osc_next_ka(this, inNumSamples, calc);
      }
    };
    var next_kk = function(inNumSamples) {
      if (get_table(this, 0)) {
        osc_next_kk(this, inNumSamples, calc);
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.FSinOsc = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.FSinOsc = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      var iphase = this.inputs[1][0];
      var w = this._freq * this.rate.radiansPerSample;
      this._b1 = 2 * Math.cos(w);
      this._y1 = Math.sin(iphase);
      this._y2 = Math.sin(iphase - w);
      this.outputs[0][0] = this._y1;
    };
    var next = function() {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var rate = this.rate;
      var b1, y0, y1, y2, w, i, j;
      if (freq !== this._freq) {
        this._freq = freq;
        w = freq * rate.radiansPerSample;
        this._b1 = b1 = 2 * Math.cos(w);
      } else {
        b1 = this._b1;
      }
      y1 = this._y1;
      y2 = this._y2;
      j = 0;
      for (i = rate.filterLoops; i--; ) {
        out[j++] = y0 = b1 * y1 - y2;
        out[j++] = y2 = b1 * y0 - y1;
        out[j++] = y1 = b1 * y2 - y0;
      }
      for (i = rate.filterRemain; i--; ) {
        out[j++] = y0 = b1 * y1 - y2;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  
  cc.ugen.specs.Klang = {
    $ar: {
      defaults: "specificationsArrayRef=0,freqscale=1,freqoffset=0",
      ctor: function(specificationsArrayRef, freqscale, freqoffset) {
        if (specificationsArrayRef.multichannelExpandRef) {
          specificationsArrayRef = specificationsArrayRef.multichannelExpandRef(2);
        } else {
          specificationsArrayRef = utils.asArray(specificationsArrayRef);
        }
        return this.multiNewList([C.AUDIO, freqscale, freqoffset, specificationsArrayRef]);
      }
    },
    init: function() {
      var ref = this.inputs.pop();
      var items, freqs, amps, phases;
      var specs;
      if (ref.dereference) {
        items = ref.dereference();
      } else {
        items = utils.asArray(items);
      }
      freqs  = items[0] || [];
      amps   = items[1] || utils.filledArray(freqs.length, 1);
      phases = items[2] || utils.filledArray(freqs.length, 0);
      specs  = utils.flat(utils.flop([ freqs, amps, phases ]));
      
      specs.push.apply(this.inputs, specs);
      
      return this;
    }
  };

  cc.unit.specs.Klang = (function() {
    var ctor = function() {
      this.process = next;

      var rate = this.rate;
      var numpartials = (this.numInputs - 2) / 3;
      var numcoefs    = numpartials * 3;
      var coefs       = new Float32Array(numcoefs);

      var inputs = this.inputs;
      var freqscale  = inputs[0][0] * rate.radiansPerSample;
      var freqoffset = inputs[1][0] * rate.radiansPerSample;
      var level, phase;
      var outf = 0;
      var i, j = 2, k = -1, w;
      
      for (i = 0; i < numpartials; ++i) {
        w = inputs[j++][0] * freqscale + freqoffset;
        level = inputs[j++][0];
        phase = inputs[j++][0];
        if (phase !== 0) {
          outf += coefs[++k] = level * Math.sin(phase); // y1;
          coefs[++k] = level * Math.sin(phase - w);     // y2;
        } else {
          outf += coefs[++k] = 0;            // y1;
          coefs[++k] = level * -Math.sin(w); // y2;
        }
        coefs[++k] = 2 * Math.cos(w); // b1
      }
      this._numpartials = numpartials;
      this._coefs = coefs;
      this.outputs[0][0] = outf;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var y0_0, y1_0, y2_0, b1_0;
      var y0_1, y1_1, y2_1, b1_1;
      var y0_2, y1_2, y2_2, b1_2;
      var y0_3, y1_3, y2_3, b1_3;
      var outf;
      var i, j = 0;
      
      var rate  = this.rate;
      var coefs = this._coefs;
      var numpartials = this._numpartials;
      var n = numpartials >> 2;
      
      switch (numpartials & 3) {
      case 3:
        y1_0 = coefs[0]; y2_0 = coefs[1]; b1_0 = coefs[2];
        y1_1 = coefs[3]; y2_1 = coefs[4]; b1_1 = coefs[5];
        y1_2 = coefs[6]; y2_2 = coefs[7]; b1_2 = coefs[8];

        for (i = rate.filterLoops; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          outf += y0_2 = b1_2 * y1_2 - y2_2;
          out[j++] = outf;

          outf  = y2_0 = b1_0 * y0_0 - y1_0;
          outf += y2_1 = b1_1 * y0_1 - y1_1;
          outf += y2_2 = b1_2 * y0_2 - y1_2;
          out[j++] = outf;

          outf  = y1_0 = b1_0 * y2_0 - y0_0;
          outf += y1_1 = b1_1 * y2_1 - y0_1;
          outf += y1_2 = b1_2 * y2_2 - y0_2;
          out[j++] = outf;
        }
        for (i = rate.filterRemain; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          outf += y0_2 = b1_2 * y1_2 - y2_2;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
          y2_2 = y1_2; y1_2 = y0_2;
          out[j++] = outf;
        }
        coefs[0] = y1_0; coefs[1] = y2_0;
        coefs[3] = y1_1; coefs[4] = y2_1;
        coefs[6] = y1_2; coefs[7] = y2_2;
        break;
        
      case 2:
        y1_0 = coefs[0]; y2_0 = coefs[1]; b1_0 = coefs[2];
        y1_1 = coefs[3]; y2_1 = coefs[4]; b1_1 = coefs[5];

        for (i = rate.filterLoops; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          out[j++] = outf;

          outf  = y2_0 = b1_0 * y0_0 - y1_0;
          outf += y2_1 = b1_1 * y0_1 - y1_1;
          out[j++] = outf;

          outf  = y1_0 = b1_0 * y2_0 - y0_0;
          outf += y1_1 = b1_1 * y2_1 - y0_1;
          out[j++] = outf;
        }
        for (i = rate.filterRemain; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
          out[j++] = outf;
        }
        coefs[0] = y1_0; coefs[1] = y2_0;
        coefs[3] = y1_1; coefs[4] = y2_1;
        break;

      case 1:
        y1_0 = coefs[0]; y2_0 = coefs[1]; b1_0 = coefs[2];
        
        for (i = rate.filterLoops; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          out[j++] = outf;

          outf  = y2_0 = b1_0 * y0_0 - y1_0;
          out[j++] = outf;

          outf  = y1_0 = b1_0 * y2_0 - y0_0;
          out[j++] = outf;
        }
        for (i = rate.filterRemain; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          y2_0 = y1_0; y1_0 = y0_0;
          out[j++] = outf;
        }
        coefs[0] = y1_0; coefs[1] = y2_0;
        break;
        
      case 0:
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = 0;
        }
        break;
      }

      while (n--) {
        y1_0 = coefs[0]; y2_0 = coefs[ 1]; b1_0 = coefs[ 2];
        y1_1 = coefs[3]; y2_1 = coefs[ 4]; b1_1 = coefs[ 5];
        y1_2 = coefs[6]; y2_2 = coefs[ 7]; b1_2 = coefs[ 8];
        y1_3 = coefs[9]; y2_3 = coefs[10]; b1_3 = coefs[11];

        for (i = rate.filterLoops; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          outf += y0_2 = b1_2 * y1_2 - y2_2;
          outf += y0_3 = b1_3 * y1_3 - y2_3;
          out[j++] = outf;

          outf  = y2_0 = b1_0 * y0_0 - y1_0;
          outf += y2_1 = b1_1 * y0_1 - y1_1;
          outf += y2_2 = b1_2 * y0_2 - y1_2;
          outf += y2_3 = b1_3 * y0_3 - y1_3;
          out[j++] = outf;

          outf  = y1_0 = b1_0 * y2_0 - y0_0;
          outf += y1_1 = b1_1 * y2_1 - y0_1;
          outf += y1_2 = b1_2 * y2_2 - y0_2;
          outf += y1_3 = b1_3 * y2_3 - y0_3;
          out[j++] = outf;
        }
        for (i = rate.filterRemain; i--; ) {
          outf  = y0_0 = b1_0 * y1_0 - y2_0;
          outf += y0_1 = b1_1 * y1_1 - y2_1;
          outf += y0_2 = b1_2 * y1_2 - y2_2;
          outf += y0_3 = b1_3 * y1_3 - y2_3;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
          y2_2 = y1_2; y1_2 = y0_2;
          y2_3 = y1_3; y1_3 = y0_3;
          out[j++] = outf;
        }
        coefs[0] = y1_0; coefs[ 1] = y2_0;
        coefs[3] = y1_1; coefs[ 4] = y2_1;
        coefs[6] = y1_2; coefs[ 7] = y2_2;
        coefs[9] = y1_3; coefs[10] = y2_3;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Klank = {
    $ar: {
      defaults: "specificationsArrayRef=0,input=0,freqscale=1,freqoffset=0,decayscale=1",
      ctor: function(specificationsArrayRef, input, freqscale, freqoffset, decayscale) {
        if (specificationsArrayRef.multichannelExpandRef) {
          specificationsArrayRef = specificationsArrayRef.multichannelExpandRef(2);
        } else {
          specificationsArrayRef = utils.asArray(specificationsArrayRef);
        }
        return this.multiNewList([C.AUDIO, input, freqscale, freqoffset, decayscale, specificationsArrayRef]);
      }
    },
    init: function() {
      var ref = this.inputs.pop();
      var items, freqs, amps, times;
      var specs;
      if (ref.dereference) {
        items = ref.dereference();
      } else {
        items = utils.asArray(items);
      }
      freqs = items[0] || [];
      amps  = items[1] || utils.filledArray(freqs.length, 1);
      times = items[2] || utils.filledArray(freqs.length, 1);
      specs  = utils.flat(utils.flop([ freqs, amps, times ]));
      
      specs.push.apply(this.inputs, specs);

      return this;
    }
  };

  cc.unit.specs.Klank = (function() {
    var ctor = function() {
      this.process = next;
      
      var rate = this.rate;
      var numpartials = (this.numInputs - 4) / 3;
      var numcoefs    = ((numpartials + 3) & ~3) * 5;
      var coefs = new Float32Array(numcoefs + this.bufLength);
      var buf   = new Float32Array(coefs.buffer, numcoefs * 4);

      var inputs = this.inputs;
      var freqscale  = inputs[1][0] * rate.radiansPerSample;
      var freqoffset = inputs[2][0] * rate.radiansPerSample;
      var decayscale = inputs[3][0];

      var level, time;
      var R, twoR, R2, cost;
      var sampleRate = rate.sampleRate;

      var i, j = 4, k, w;

      for (i = 0; i < numpartials; ++i) {
        w = inputs[j++][0] * freqscale + freqoffset;
        level = inputs[j++][0];
        time  = inputs[j++][0] * decayscale;
        R = time === 0 ? 0 : Math.exp(log001 / (time * sampleRate));
        twoR = 2 * R;
        R2 = R * R;
        cost = (twoR * Math.cos(w)) / (1 + R2);

        k = 20 * (i >> 2) + (i & 3);
        coefs[k]   = 0;             // y1
        coefs[k+4] = 0;             // y2
        coefs[k+8] = twoR * cost;   // b1
        coefs[k+12] = -R2;          // b2
        coefs[k+16] = level * 0.25; // a0
      }
      
      this._numpartials = numpartials;
      this._coefs = coefs;
      this._buf   = buf;
      this._x1 = 0;
      this._x2 = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var y0_0, y1_0, y2_0, a0_0, b1_0, b2_0;
      var y0_1, y1_1, y2_1, a0_1, b1_1, b2_1;
      var y0_2, y1_2, y2_2, a0_2, b1_2, b2_2;
      var y0_3, y1_3, y2_3, a0_3, b1_3, b2_3;
      var inf;
      var i, j = 0;

      var rate  = this.rate;
      var coefs = this._coefs;
      var numpartials = this._numpartials;
      var buf = this._buf;
      var n = numpartials >> 2;
      var k = n * 20;
      switch (numpartials & 3) {
      case 3:
        y1_0 = coefs[k+0]; y2_0 = coefs[k+4]; b1_0 = coefs[k+ 8]; b2_0 = coefs[k+12]; a0_0 = coefs[k+16];
        y1_1 = coefs[k+1]; y2_1 = coefs[k+5]; b1_1 = coefs[k+ 9]; b2_1 = coefs[k+13]; a0_1 = coefs[k+17];
        y1_2 = coefs[k+2]; y2_2 = coefs[k+6]; b1_2 = coefs[k+10]; b2_2 = coefs[k+14]; a0_2 = coefs[k+18];
        for (i = rate.filterLoops; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          y0_2 = inf + b1_2 * y1_2 + b2_2 * y2_2;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1 + a0_2 * y0_2;

          inf = inIn[j];
          y2_0 = inf + b1_0 * y0_0 + b2_0 * y1_0;
          y2_1 = inf + b1_1 * y0_1 + b2_1 * y1_1;
          y2_2 = inf + b1_2 * y0_2 + b2_2 * y1_2;
          buf[j++] = a0_0 * y2_0 + a0_1 * y2_1 + a0_2 * y2_2;

          inf = inIn[j];
          y1_0 = inf + b1_0 * y2_0 + b2_0 * y0_0;
          y1_1 = inf + b1_1 * y2_1 + b2_1 * y0_1;
          y1_2 = inf + b1_2 * y2_2 + b2_2 * y0_2;
          buf[j++] = a0_0 * y1_0 + a0_1 * y1_1 + a0_2 * y1_2;
        }
        for (i = rate.filterRemain; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          y0_2 = inf + b1_2 * y1_2 + b2_2 * y2_2;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1 + a0_2 * y0_2;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
          y2_2 = y1_2; y1_2 = y0_2;
        }
        coefs[k+0] = y1_0; coefs[k+4] = y2_0;
        coefs[k+1] = y1_1; coefs[k+5] = y2_1;
        coefs[k+2] = y1_2; coefs[k+6] = y2_2;
        break;
        
      case 2:
        y1_0 = coefs[k+0]; y2_0 = coefs[k+4]; b1_0 = coefs[k+ 8]; b2_0 = coefs[k+12]; a0_0 = coefs[k+16];
        y1_1 = coefs[k+1]; y2_1 = coefs[k+5]; b1_1 = coefs[k+ 9]; b2_1 = coefs[k+13]; a0_1 = coefs[k+17];
        for (i = rate.filterLoops; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1;

          inf = inIn[j];
          y2_0 = inf + b1_0 * y0_0 + b2_0 * y1_0;
          y2_1 = inf + b1_1 * y0_1 + b2_1 * y1_1;
          buf[j++] = a0_0 * y2_0 + a0_1 * y2_1;

          inf = inIn[j];
          y1_0 = inf + b1_0 * y2_0 + b2_0 * y0_0;
          y1_1 = inf + b1_1 * y2_1 + b2_1 * y0_1;
          buf[j++] = a0_0 * y1_0 + a0_1 * y1_1;
        }
        for (i = rate.filterRemain; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
        }
        coefs[k+0] = y1_0; coefs[k+4] = y2_0;
        coefs[k+1] = y1_1; coefs[k+5] = y2_1;
        break;

      case 1:
        y1_0 = coefs[k+0]; y2_0 = coefs[k+4]; b1_0 = coefs[k+ 8]; b2_0 = coefs[k+12]; a0_0 = coefs[k+16];
        for (i = rate.filterLoops; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          buf[j++] = a0_0 * y0_0;

          inf = inIn[j];
          y2_0 = inf + b1_0 * y0_0 + b2_0 * y1_0;
          buf[j++] = a0_0 * y2_0;

          inf = inIn[j];
          y1_0 = inf + b1_0 * y2_0 + b2_0 * y0_0;
          buf[j++] = a0_0 * y1_0;
        }
        for (i = rate.filterRemain; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          buf[j++] = a0_0 * y0_0;
          y2_0 = y1_0; y1_0 = y0_0;
        }
        coefs[k+0] = y1_0; coefs[k+4] = y2_0;
        break;
        
      case 0:
        for (i = 0; i < inNumSamples; ++i) {
          buf[i] = 0;
        }
        break;
      }

      j = k = 0;
      while (n--) {
        y1_0 = coefs[k+0]; y2_0 = coefs[k+4]; b1_0 = coefs[k+ 8]; b2_0 = coefs[k+12]; a0_0 = coefs[k+16];
        y1_1 = coefs[k+1]; y2_1 = coefs[k+5]; b1_1 = coefs[k+ 9]; b2_1 = coefs[k+13]; a0_1 = coefs[k+17];
        y1_2 = coefs[k+2]; y2_2 = coefs[k+6]; b1_2 = coefs[k+10]; b2_2 = coefs[k+14]; a0_2 = coefs[k+18];
        y1_3 = coefs[k+3]; y2_3 = coefs[k+7]; b1_3 = coefs[k+11]; b2_3 = coefs[k+15]; a0_3 = coefs[k+19];
        for (i = rate.filterLoops; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          y0_2 = inf + b1_2 * y1_2 + b2_2 * y2_2;
          y0_3 = inf + b1_3 * y1_3 + b2_3 * y2_3;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1 + a0_2 * y0_2 + a0_3 * y0_3;

          inf = inIn[j];
          y2_0 = inf + b1_0 * y0_0 + b2_0 * y1_0;
          y2_1 = inf + b1_1 * y0_1 + b2_1 * y1_1;
          y2_2 = inf + b1_2 * y0_2 + b2_2 * y1_2;
          y2_3 = inf + b1_3 * y0_3 + b2_3 * y1_3;
          buf[j++] = a0_0 * y2_0 + a0_1 * y2_1 + a0_2 * y2_2 + a0_3 * y2_3;

          inf = inIn[j];
          y1_0 = inf + b1_0 * y2_0 + b2_0 * y0_0;
          y1_1 = inf + b1_1 * y2_1 + b2_1 * y0_1;
          y1_2 = inf + b1_2 * y2_2 + b2_2 * y0_2;
          y1_3 = inf + b1_3 * y2_3 + b2_3 * y0_3;
          buf[j++] = a0_0 * y1_0 + a0_1 * y1_1 + a0_2 * y1_2 + a0_3 * y1_3;
        }
        for (i = rate.filterRemain; i--; ) {
          inf = inIn[j];
          y0_0 = inf + b1_0 * y1_0 + b2_0 * y2_0;
          y0_1 = inf + b1_1 * y1_1 + b2_1 * y2_1;
          y0_2 = inf + b1_2 * y1_2 + b2_2 * y2_2;
          y0_3 = inf + b1_3 * y1_3 + b2_3 * y2_3;
          buf[j++] = a0_0 * y0_0 + a0_1 * y0_1 + a0_2 * y0_2 + a0_3 * y0_3;
          y2_0 = y1_0; y1_0 = y0_0;
          y2_1 = y1_1; y1_1 = y0_1;
          y2_2 = y1_2; y1_2 = y0_2;
          y2_3 = y1_3; y1_3 = y0_3;
        }
        coefs[k+0] = y1_0; coefs[k+4] = y2_0;
        coefs[k+1] = y1_1; coefs[k+5] = y2_1;
        coefs[k+2] = y1_2; coefs[k+6] = y2_2;
        coefs[k+3] = y1_3; coefs[k+7] = y2_3;
        k += 20;
      }

      var x0;
      var x1 = this._x1;
      var x2 = this._x2;
      
      j = 0;
      for (i = rate.filterLoops; i--;) {
        x0 = buf[j];
        out[j++] = x0 - x2;
        x2 = buf[j];
        out[j++] = x2 - x1;
        x1 = buf[j];
        out[j++] = x1 - x0;
      }
      for (i = rate.filterRemain; i--;) {
        x0 = buf[j];
        out[j++] = x0 - x2;
        x2 = x1;
        x1 = x0;
      }
      
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.DynKlank = {
    $ar: {
      defaults: "specificationsArrayRef=0,input=0,freqscale=1,freqoffset=0,decayscale=1",
      ctor: function(specificationsArrayRef, input, freqscale, freqoffset, decayscale) {
        if (specificationsArrayRef.multichannelExpandRef) {
          specificationsArrayRef = specificationsArrayRef.multichannelExpandRef(2);
        } else {
          specificationsArrayRef = utils.asArray(specificationsArrayRef);
        }
        return this.multiNewList([C.AUDIO, input, freqscale, freqoffset, decayscale, specificationsArrayRef]);
      }
    },
    init: function() {
      var input      = this.inputs[0];
      var freqscale  = this.inputs[1];
      var freqoffset = this.inputs[2];
      var decayscale = this.inputs[3];
      var ref        = this.inputs[4];
      var items, freqs, decays, amps;
      if (ref.dereference) {
        items = ref.dereference();
      } else {
        items = utils.asArray(items);
      }
      freqs  = items[0] || [ 440 ];
      decays = items[2] || [ 1.0 ];
      amps   = items[1] || [ 1.0 ];
      freqs  = freqs.madd(freqscale, freqoffset);
      decays = decays.madd(decayscale, 0);
      
      return cc.global.Ringz(this.rate, input, freqs, decays, amps).sum();
    }
  };

  cc.ugen.specs.DynKlang = {
    $ar: {
      defaults: "specificationsArrayRef=0,freqscale=1,freqoffset=0",
      ctor: function(specificationsArrayRef, freqscale, freqoffset) {
        if (specificationsArrayRef.multichannelExpandRef) {
          specificationsArrayRef = specificationsArrayRef.multichannelExpandRef(2);
        } else {
          specificationsArrayRef = utils.asArray(specificationsArrayRef);
        }
        return this.multiNewList([C.AUDIO, freqscale, freqoffset, specificationsArrayRef]);
      }
    },
    init: function() {
      var freqscale  = this.inputs[0];
      var freqoffset = this.inputs[1];
      var ref        = this.inputs[2];
      var items, freqs, phases, amps;
      if (ref.dereference) {
        items = ref.dereference();
      } else {
        items = utils.asArray(items);
      }
      freqs  = items[0] || [ 440 ];
      phases = items[2] || [ 0.0 ];
      amps   = items[1] || [ 1.0 ];
      freqs  = freqs.madd(freqscale, freqoffset);
      
      return cc.global.SinOsc(this.rate, freqs, phases, amps).sum();
    }
  };
  
  cc.ugen.specs.LFSaw = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.multiNew(C.AUDIO, freq, iphase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.multiNew(C.CONTROL, freq, iphase).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.LFSaw = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase    = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
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
  
  cc.ugen.specs.LFPar = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFPar = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
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
  
  cc.ugen.specs.LFCub = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFCub = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0] + 0.5;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
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
  
  cc.ugen.specs.LFTri = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFTri = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freq;
        if (phase >= 3) {
          phase -= 4;
        }
      }
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFPulse = {
    $ar: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.multiNew(C.AUDIO, freq, iphase, width).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.multiNew(C.CONTROL, freq, iphase, width).madd(mul, add);
      }
    }
  };

  cc.unit.specs.LFPulse = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this._duty    = this.inputs[2][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq     = this.inputs[0][0] * this._cpstoinc;
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
  
  cc.ugen.specs.Blip = {
    $ar: {
      defaults: "freq=440,numharm=200,mul=1,add=0",
      ctor: function(freq, numharm, mul, add) {
        return this.multiNew(C.AUDIO, freq, numharm).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Blip = (function() {
    var ctor = function() {
      this.process = next;
      this._freq    = this.inputs[0][0];
      this._numharm = this.inputs[1][0]|0;
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      var N = this._numharm;
      var maxN = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._N  = Math.max(1, Math.min(N, maxN));
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var freq  = this.inputs[0][0];
      var numharm = this.inputs[1][0]|0;
      var phase = this._phase;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, maxN, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var i, xfade, xfade_slope;
      if (numharm !== this._numharm || freq !== this._freq) {
        N    = numharm;
        maxN = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
        if (maxN < N) {
          N = maxN;
          freq = this._cpstoinc * Math.max(this._freq, freq);
        } else {
          if (N < 1) {
            N = 1;
          }
          freq = this._cpstoinc * freq;
        }
        crossfade = (N !== this._N);
        prevN = this._N;
        prevScale = this._scale;
        this._N = Math.max(1, Math.min(N, maxN));
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = 1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              out[i] = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            out[i] = n1 + xfade * (n2 - n1);
          }
          phase += freq;
          xfade += xfade_slope;
        }
      } else {
        // hmm, if freq is above sr/4 then revert to sine table osc ?
        // why bother, it isn't a common choice for a fundamental.
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = 1;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              out[i] = (numer / denom - 1) * scale;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            out[i] = (numer * denom - 1) * scale;
          }
          phase += freq;
        }
      }
      if (phase >= 65536) {
        phase -= 65536;
      }
      this._phase = phase;
      this._freq = this.inputs[0][0];
      this._numharm = numharm;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Saw = {
    $ar: {
      defaults: "freq=440,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(C.AUDIO, freq).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Saw = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      this._N    = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this._y1 = -0.46;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0];
      var phase = this._phase;
      var y1 = this._y1;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var i, xfade, xfade_slope;
      if (freq !== this._freq) {
        N = Math.max(1, (this.rate.sampleRate * 0.5 / freq)|0);
        if (N !== this._N) {
          freq = this._cpstoinc * Math.max(this._freq, freq);
          crossfade = true;
        } else {
          freq = this._cpstoinc * freq;
          crossfade = false;
        }
        prevN = this._N;
        prevScale = this._scale;
        this._N = N;
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = y1 = 1 + 0.999 * y1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              out[i] = y1 = n1 + xfade * (n2 - n1) + 0.999 * y1;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            out[i] = y1 = n1 + xfade * (n2 - n1) + 0.999 * y1;
          }
          phase += freq;
          xfade += xfade_slope;
        }
      } else {
        // hmm, if freq is above sr/4 then revert to sine table osc ?
        // why bother, it isn't a common choice for a fundamental.
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = y1 = 1 + 0.999 * y1;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              out[i] = y1 = (numer / denom - 1) * scale + 0.999 * y1;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            out[i] = y1 = (numer * denom - 1) * scale + 0.999 * y1;
          }
          phase += freq;
        }
      }
      if (phase >= 65536) { phase -= 65536; }
      this._y1 = y1;
      this._phase = phase;
      this._freq = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.Pulse = {
    $ar: {
      defaults: "freq=440,width=0.5,mul=1,add=0",
      ctor: function(freq, width, mul, add) {
        return this.multiNew(C.AUDIO, freq, width).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Pulse = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      this._N = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this._duty  = 0;
      this._y1 = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq  = this.inputs[0][0];
      var duty  = this._duty;
      var phase = this._phase;
      var y1 = this._y1;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var phase2, nextDuty, duty_slope, rscale, pul1, pul2;
      var i, xfade, xfade_slope;
      if (freq !== this._freq) {
        N = Math.max(1, (this.rate.sampleRate * 0.5 / freq)|0);
        if (N !== this._N) {
          freq = this._cpstoinc * Math.max(this._freq, freq);
          crossfade = true;
        } else {
          freq = this._cpstoinc * freq;
          crossfade = false;
        }
        prevN = this._N;
        prevScale = this._scale;
        this._N = N;
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;

      nextDuty = this.inputs[1][0];
      duty_slope = (nextDuty - duty) * this.rate.slopeFactor;
      rscale = 1 / scale + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul1 = 1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              pul1 = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            pul1 = n1 + xfade * (n2 - n1);
          }

          phase2 = phase + (duty * kSineSize * 0.5);
          tblIndex = phase2 & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul2 = 1;
            } else {
              rphase = phase2 * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase2 * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              pul2 = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase2 * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase2 * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            pul2 = n1 + xfade * (n2 - n1);
          }
          out[i] = y1 = pul1 - pul2 + 0.999 * y1;
          phase += freq;
          duty  += duty_slope;
          xfade += xfade_slope;
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul1 = rscale;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              pul1 = numer / denom;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            pul1 = numer * denom;
          }

          phase2 = phase + (duty * kSineSize * 0.5);
          tblIndex = phase2 & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul2 = rscale;
            } else {
              rphase = phase2 * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              pul2 = numer / denom;
            }
          } else {
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase2 * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            pul2 = numer * denom;
          }
          out[i] = y1 = (pul1 - pul2) * scale + 0.999 * y1;
          phase += freq;
          duty  += duty_slope;
        }
      }
      if (phase >= 65536) { phase -= 65536; }
      this._y1 = y1;
      this._phase = phase;
      this._freq = this.inputs[0][0];
      this._duty = nextDuty;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Impulse = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Impulse = (function() {
    var ctor = function() {
      this._phase = this.inputs[1][0];
      if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
        if (this.inRates[1] !== C.SCALAR) {
          this._phase = 1;
        }
      } else {
        this.process = next_k;
        if (this.inRates[1] !== C.SCALAR) {
          this._phase = 1;
        }
      }
      this._phaseOffset = 0;
      this._cpstoinc    = this.rate.sampleDur;
      if (this._phase === 0) {
        this._phase = 1;
      }
    };
    var next_a = function(inNumSamples) {
      var out     = this.outputs[0];
      var freqIn  = this.inputs[0];
      var phaseOffset = this.inputs[1][0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
    };
    var next_k = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phaseOffset = this.inputs[1][0];
      var phase = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freq;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
    };
    return ctor;
  })();

  cc.ugen.specs.TrigImpulse = {
    $ar: {
      defaults: "trig=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(trig, freq, phase, mul, add) {
        return this.multiNew(C.AUDIO, trig, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "trig=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(trig, freq, phase, mul, add) {
        return this.multiNew(C.CONTROL, trig, freq, phase).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.TrigImpulse = (function() {
    var ctor = function() {
      this._phase = this.inputs[2][0];
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_ka;
        if (this.inRates[2] !== C.SCALAR) {
          this._phase = 1;
        }
      } else {
        this.process = next_kk;
        if (this.inRates[2] !== C.SCALAR) {
          this._phase = 1;
        }
      }
      this._phaseOffset = 0;
      this._cpstoinc    = this.rate.sampleDur;
      if (this._phase === 0) {
        this._phase = 1;
      }
      this._prevTrig = this.inputs[0][0];
    };
    var next_ka = function(inNumSamples) {
      var out     = this.outputs[0];
      var trig    = this.inputs[0];
      var freqIn  = this.inputs[1];
      var phaseOffset = this.inputs[2][0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      var prevTrig = this._prevTrig;
      if (trig > 0 && prevTrig <= 0) {
        phase = phaseOffset;
        if (this.inRates[2] !== C.SCALAR) {
          phase = 1;
        }
        if (phase === 0) {
          phase = 1;
        }
      }
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
      this._prevTrig    = trig;
    };
    var next_kk = function(inNumSamples) {
      var out  = this.outputs[0];
      var trig = this.inputs[0][0];
      var freq = this.inputs[1][0] * this._cpstoinc;
      var phaseOffset = this.inputs[2][0];
      var phase = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      var prevTrig = this._prevTrig;
      if (trig > 0 && prevTrig <= 0) {
        phase = phaseOffset;
        if (this.inRates[2] !== C.SCALAR) {
          phase = 1;
        }
        if (phase === 0) {
          phase = 1;
        }
      }
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freq;
      }
      this._phase       = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
      this._prevTrig    = trig;
    };
    return ctor;
  })();
  
  cc.ugen.specs.SyncSaw = {
    $ar: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return this.multiNew(C.AUDIO, syncFreq, sawFreq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return this.multiNew(C.CONTROL, syncFreq, sawFreq).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SyncSaw = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        if (this.inRates[1] === C.AUDIO) {
          this.process = next_aa;
        } else {
          this.process = next_ak;
        }
      } else {
        if (this.inRates[1] === C.AUDIO) {
          this.process = next_ka;
        } else {
          this.process = next_kk;
        }
      }
      this._freqMul = 2 * this.rate.sampleDur;
      this._phase1 = 0;
      this._phase2 = 0;
      next_kk.call(this, 1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      for (var i = 0; i < inNumSamples; ++i) {
        freq1x = freq1In[i] * freqMul;
        freq2x = freq2In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      freq2x = freq2In[0] * freqMul;
      for (var i = 0; i < inNumSamples; ++i) {
        freq1x = freq1In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      freq1x = freq1In[0] * freqMul;
      for (var i = 0; i < inNumSamples; ++i) {
        freq2x = freq2In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1x = this.inputs[0][0] * this._freqMul;
      var freq2x = this.inputs[1][0] * this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Select = {
    $ar: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return this.multiNewList([C.AUDIO, which].concat(array));
      }
    },
    $kr: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return this.multiNewList([C.CONTROL, which].concat(array));
      }
    },
    checkInputs: function() {
      if (this.rate === C.AUDIO) {
        var inputs = this.inputs;
        for (var i = 1, imax = inputs.length; i < imax; ++i) {
          if (inputs[i].rate !== C.AUDIO) {
            throw new Error("input was not audio rate:" + inputs[i].toString());
          }
        }
      }
    }
  };

  cc.unit.specs.Select = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else if (this.inRates[0] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._maxIndex = this.inputs.length - 1;
      next_1.call(this);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inputs  = this.inputs;
      var whichIn = inputs[0];
      var maxIndex = this._maxIndex;
      var index;
      for (var i = 0; i < inNumSamples; ++i) {
        index = Math.max(1, Math.min((whichIn[i]|0) + 1, maxIndex));
        out[i] = inputs[index][i];
      }
    };
    var next_k = function() {
      var index = Math.max(1, Math.min((this.inputs[0][0]|0) + 1, this._maxIndex));
      this.outputs[0].set(this.inputs[index]);
    };
    var next_1 = function() {
      var index = Math.max(1, Math.min((this.inputs[0][0]|0) + 1, this._maxIndex));
      this.outputs[0][0] = this.inputs[index][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.DC = {
    $ir: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.SCALAR, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.CONTROL, _in);
      }
    },
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.AUDIO, _in);
      }
    }
  };

  cc.unit.specs.DC = (function() {
    var ctor = function() {
      var out = this.outputs[0];
      var val = this.inputs[0][0];
      for (var i = out.length; i--; ) {
        out[i] = val;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Silent = {
    $ir: {
      ctor: function() {
        return cc.global.DC.ir(0);
      }
    },
    $kr: {
      ctor: function() {
        return cc.global.DC.kr(0);
      }
    },
    $ar: {
      ctor: function() {
        return cc.global.DC.ar(0);
      }
    }
  };
  
  module.exports = {};

});
