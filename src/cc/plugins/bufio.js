define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  var cubicinterp = utils.cubicinterp;
  var slice = [].slice;

  var sc_loop = function(unit, index, hi, loop) {
    if (index >= hi) {
      if (!loop) {
        unit.done = true;
        return hi;
      }
      index -= hi;
      if (index < hi) {
        return index;
      }
    } else if (index < 0) {
      if (!loop) {
        unit.done = true;
        return 0;
      }
      index += hi;
      if (index >= 0) {
        return index;
      }
    } else {
      return index;
    }
    return index - hi * Math.floor(index/hi);
  };

  var get_indices = function(phase, hi, loop) {
    var index1 = phase|0;
    var index0 = index1 - 1;
    var index2 = index1 + 1;
    var index3 = index2 + 1;
    if (index1 === 0) {
      if (loop) {
        index0 = hi;
      } else {
        index0 = index1;
      }
    } else if (index3 > hi) {
      if (index2 > hi) {
        if (loop) {
          index2 = 0;
          index3 = 1;
        } else {
          index2 = index3 = hi;
        }
      } else {
        if (loop) {
          index3 = 0;
        } else {
          index3 = hi;
        }
      }
    }
    return [ index0, index1, index2, index3 ];
  };

  var get_buffer = function(instance) {
    var buffer = instance.buffers[this.inputs[0][0]|0];
    if (buffer) {
      var samples = buffer.samples;
      if (samples) {
        this._frames     = buffer.frames;
        this._channels   = buffer.channels;
        this._sampleRate = buffer.sampleRate;
        this._samples    = samples;
        return true;
      }
    }
    return false;
  };
  
  cc.ugen.specs.PlayBuf = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(C.AUDIO, numChannels, bufnum, rate, trigger, startPos, loop, doneAction);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(C.CONTROL, numChannels, bufnum, rate, trigger, startPos, loop, doneAction);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      return this.initOutputs(numChannels, this.rate);
    }
  };

  cc.unit.specs.PlayBuf = (function() {
    var ctor = function() {
      switch (this.numOfOutputs) {
      case 1: this.process = next_1ch; break;
      case 2: this.process = next_2ch; break;
      default: this.process = next;
      }
      this._samples  = null;
      this._channels = 0;
      this._frames   = 0;
      this._phase = this.inputs[3][0];
      this._trig  = 0;
    };
    
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var out   = this.outputs[0];
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      var hi = frames - 1;
      
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        
        a = samples[indices[0]];
        b = samples[indices[1]];
        c = samples[indices[2]];
        d = samples[indices[3]];
        out[i] = cubicinterp(frac, a, b, c, d);
        
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var out1  = this.outputs[0];
      var out2  = this.outputs[1];
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      var hi = frames - 1;
      
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        
        a = samples[indices[0] * 2];
        b = samples[indices[1] * 2];
        c = samples[indices[2] * 2];
        d = samples[indices[3] * 2];
        out1[i] = cubicinterp(frac, a, b, c, d);
        
        a = samples[indices[0] * 2 + 1];
        b = samples[indices[1] * 2 + 1];
        c = samples[indices[2] * 2 + 1];
        d = samples[indices[3] * 2 + 1];
        out2[i] = cubicinterp(frac, a, b, c, d);
        
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    var next = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var outputs = this.outputs;
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var channels = this._channels;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      
      var hi = frames - 1;
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        for (var j = 0, jmax = outputs.length; j < jmax; ++j) {
          a = samples[indices[0] * channels + j];
          b = samples[indices[1] * channels + j];
          c = samples[indices[2] * channels + j];
          d = samples[indices[3] * channels + j];
          outputs[j][i] = cubicinterp(frac, a, b, c, d);
        }
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.BufRd = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(C.AUDIO, numChannels, bufnum, phase, loop, interpolation);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(C.CONTROL, numChannels, bufnum, phase, loop, interpolation);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      return this.initOutputs(numChannels, this.rate);
    }
  };

  var perform_N = function(samples, indices, mul, add) {
    return samples[indices[1] * mul + add];
  };
  var perform_L = function(samples, indices, mul, add, frac) {
    var b = samples[indices[1] * mul + add];
    var c = samples[indices[2] * mul + add];
    return b + frac * (c - b);
  };
  var perform_C = function(samples, indices, mul, add, frac) {
    var a = samples[indices[0] * mul + add];
    var b = samples[indices[1] * mul + add];
    var c = samples[indices[2] * mul + add];
    var d = samples[indices[3] * mul + add];
    return cubicinterp(frac, a, b, c, d);
  };
  cc.unit.specs.BufRd = (function() {
    var ctor = function() {
      switch (this.numOfOutputs) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
      }
      switch (this.inputs[3][0]|0) {
      case 1 : this._perform = perform_N; break;
      case 4 : this._perform = perform_C; break;
      default: this._perform = perform_L; break;
      }
    };
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var out = this.outputs[0];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out[i] = perform(samples, indices, 1, 0, frac);
      }
    };
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var out1 = this.outputs[0];
      var out2 = this.outputs[1];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out1[i] = perform(samples, indices, 2, 0, frac);
        out2[i] = perform(samples, indices, 2, 1, frac);
      }
    };
    var next = function(inNumSamples, instance) {
      if (!get_buffer.call(this, instance)) {
        return;
      }
      var outputs = this.outputs;
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        for (var j = 0, jmax = outputs.length; j < jmax; ++j) {
          outputs[j][i] = perform(samples, indices, jmax, j, frac);
        }
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufSampleRate = {
    $kr: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.multiNew(C.CONTROL, bufnum);
      }
    },
    $ir: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.multiNew(C.SCALAR, bufnum);
      }
    }
  };

  cc.unit.specs.BufSampleRate = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._sampleRate;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufRateScale = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufRateScale = (function() {
    var ctor = function() {
      this.process = next;
      this._sampleDur = cc.server.rates[C.AUDIO].sampleDur;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._sampleRate * this._sampleDur;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufFrames = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufFrames = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._frames;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufSamples   = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufSamples = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._samples.length;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufDur = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufDur = (function() {
    var ctor = function() {
      this.process = next;
      this._sampleDur = cc.server.rates[C.AUDIO].sampleDur;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._frames * this._sampleDur;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufChannels = cc.ugen.specs.BufSampleRate;
  
  cc.unit.specs.BufChannels = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer.call(this, instance)) {
        this.outputs[0][0] = this._channels;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
