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

  var get_buffer = function(unit, instance) {
    var buffer = instance.buffers[unit.inputs[0][0]|0];
    if (buffer) {
      var samples = buffer.samples;
      if (samples.length) {
        unit._frames     = buffer.frames;
        unit._channels   = buffer.channels;
        unit._sampleRate = buffer.sampleRate;
        unit._samples    = samples;
        return true;
      }
    }
    return false;
  };

  var asArray = function(obj) {
    if (Array.isArray(obj)) {
      return obj;
    }
    return [obj];
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
      if (!get_buffer(this, instance)) {
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
      if (!get_buffer(this, instance)) {
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
      if (!get_buffer(this, instance)) {
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
      this._samples  = null;
      this._channels = 0;
      this._frames   = 0;
    };
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out = this.outputs[0];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples = this._samples;
      var frames  = this._frames;
      var perform = this._perform;
      var phase, indices, frac;
      var hi = frames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out[i] = perform(samples, indices, 1, 0, frac);
      }
    };
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out1 = this.outputs[0];
      var out2 = this.outputs[1];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples = this._samples;
      var frames  = this._frames;
      var perform = this._perform;
      var phase, indices, frac;
      var hi = frames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out1[i] = perform(samples, indices, 2, 0, frac);
        out2[i] = perform(samples, indices, 2, 1, frac);
      }
    };
    var next = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var outputs = this.outputs;
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples = this._samples;
      var frames  = this._frames;
      var perform = this._perform;
      var phase, indices, frac;
      var hi = frames - 1;
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

  cc.ugen.specs.BufWr = {
    $ar: {
      defaults: "inputArray=[],bufnum=0,phase=0,loop=1",
      ctor: function(inputArray, bufnum, phase, loop) {
        return this.multiNewList([C.AUDIO, bufnum, phase, loop].concat(asArray(inputArray)));
      }
    },
    $kr: {
      defaults: "inputArray=[],bufnum=0,phase=0,loop=1",
      ctor: function(inputArray, bufnum, phase, loop) {
        return this.multiNewList([C.CONTROL, bufnum, phase, loop].concat(asArray(inputArray)));
      }
    },
    checkNInputs: function() {
      if (this.rate === C.AUDIO && this.inputs[1].rate !== C.AUDIO) {
        throw new Error("phase input is not audio rate");
      }
    }
  };

  cc.unit.specs.BufWr = (function() {
    var ctor = function() {
      switch (this.numOfInputs - 3) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
        break;
      }
    };
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var in0In   = this.inputs[3];
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var phase;
      var i;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        samples[phase|0] = in0In[i];
      }
    };
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var in0In   = this.inputs[3];
      var in1In   = this.inputs[4];
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var phase, index;
      var i;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        index = phase << 1;
        samples[index  ] = in0In[i];
        samples[index+1] = in1In[i];
      }
    };
    var next = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var inputs  = this.inputs;
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var channels = this._channels;
      var phase, index;
      var i, j;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        index = (phase|0) * channels;
        for (j = 0; j < channels; ++j) {
          samples[index+j] = inputs[j+3][i];
        }
      }
    };
    return ctor;
  })();

  cc.ugen.specs.RecordBuf = {
    $ar: {
      defaults: "inputArray=[],bufnum=0,offset=0,recLevel=1,preLevel=0,run=1,loop=1,trigger=1,doneAction=0",
      ctor: function(inputArray, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction) {
        return this.multiNewList([
          C.AUDIO, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction
        ].concat(asArray(inputArray)));
      }
    },
    $kr: {
      defaults: "inputArray=[],bufnum=0,offset=0,recLevel=1,preLevel=0,run=1,loop=1,trigger=1,doneAction=0",
      ctor: function(inputArray, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction) {
        return this.multiNewList([
          C.CONTROL, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction
        ].concat(asArray(inputArray)));
      }
    }
  };

  cc.unit.specs.RecordBuf = (function() {
    var ctor = function() {
      switch (this.numOfInputs - 8) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
        break;
      }
      this._writepos = this.inputs[1][0];
      this._recLevel = this.inputs[2][0];
      this._preLevel = this.inputs[3][0];
      this._prevtrig = 0;
      this._preindex = 0;
    };
    var recbuf_next = function(func) {
      return function(inNumSamples, instance) {
        if (!get_buffer(this, instance)) {
          return;
        }
        var channels = this._channels;
        var frames   = this._frames;
        var samples  = this._samples;
        var inputs   = this.inputs;
        var recLevel = this.inputs[2][0];
        var preLevel = this.inputs[3][0];
        var run      = this.inputs[4][0];
        var loop     = this.inputs[5][0]|0;
        var trig     = this.inputs[6][0];
        var writepos = this._writepos;
        var recLevel_slope = (recLevel - this._recLevel) * this.rate.slopeFactor;
        var preLevel_slope = (preLevel - this._preLevel) * this.rate.slopeFactor;
        var prevpos, posincr;
        var i;
        recLevel = this._recLevel;
        preLevel = this._preLevel;
        prevpos  = this._prevpos;
        posincr  = run > 0 ? +1 : -1;
        if (trig > 0 && this._prevtrig) {
          this.done = false;
          writepos  = (this.inputs[1][0] * channels)|0;
        }
        if (writepos < 0) {
          writepos = frames - 1;
        } else if (writepos >= frames) {
          writepos = 0;
        }
        for (i = 0; i < inNumSamples; ++i) {
          func(inputs, i, samples, writepos, prevpos, recLevel, preLevel, channels);
          prevpos   = writepos;
          writepos += posincr;
          if (writepos >= frames) {
            if (loop) {
              writepos = 0;
            } else {
              writepos = frames - 1;
              this.done = true;
            }
          } else if (0 < writepos) {
            if (loop) {
              writepos = frames - 1;
            } else {
              writepos  = 0;
              this.done = true;
            }
          }
          recLevel += recLevel_slope;
          preLevel += preLevel_slope;
        }
        if (this.done) {
          this.doneAction(this.inputs[7][0]|0);
        }
        this._prevtrig = trig;
        this._writepos = writepos;
        this._prevpos  = prevpos;
        this._recLevel = recLevel;
        this._preLevel = preLevel;
      };
    };

    var next_1ch = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel) {
      samples[writepos] = inputs[8][index] * recLevel + samples[prevpos] * preLevel;
    });

    var next_2ch = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel) {
      samples[writepos*2  ] = inputs[8][index] * recLevel + samples[prevpos*2  ] * preLevel;
      samples[writepos*2+1] = inputs[9][index] * recLevel + samples[prevpos*2+1] * preLevel;
    });

    var next = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel, channels) {
      var j;
      for (j = 0; j < channels; ++j) {
        samples[writepos*channels+j] = inputs[8+j][index] + recLevel * samples[prevpos*channels+j] * preLevel;
      }
    });
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
      if (get_buffer(this, instance)) {
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
      if (get_buffer(this, instance)) {
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
      if (get_buffer(this, instance)) {
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
      if (get_buffer(this, instance)) {
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
      if (get_buffer(this, instance)) {
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
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._channels;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
