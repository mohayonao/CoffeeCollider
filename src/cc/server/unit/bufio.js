define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  
  var cubicinterp = utils.cubicinterp;
  
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
  
  cc.unit.specs.PlayBuf = (function() {
    var ctor = function() {
      switch (this.numOfOutput) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
      }
      this._bufnumIn = this.inputs[0];
      this._samples  = null;
      this._channels = 0;
      this._frames   = 0;
      this._phase = this.inputs[3][0];
      this._trig  = 0;
    };
    
    var get_buffer = function(instance) {
      var buffer = instance.buffers[this._bufnumIn[0]|0];
      if (buffer) {
        var samples = buffer.samples;
        if (samples) {
          this._samples  = samples;
          this._channels = buffer.channels;
          this._frames   = buffer.frames;
          return true;
        }
      }
      return false;
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
        this.doneAction(this.inputs[5][0]|0, this.tag);
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
        this.doneAction(this.inputs[5][0]|0, this.tag);
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
        this.doneAction(this.inputs[5][0]|0, this.tag);
      }
      this._phase = phase;
    };
    
    return ctor;
  })();
  
  module.exports = {};

});
