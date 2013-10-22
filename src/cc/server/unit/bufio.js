define(function(require, exports, module) {
  "use strict";
  
  var unit = require("./unit");
  var buffer = require("../buffer");
  
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
  
  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };
  
  var PlayBuf = function() {
    var ctor = function() {
      this._buffer = buffer.get(this.specialIndex);
      this._phase  = this.inputs[3][0];
      this._trig   = 0;
      this.process = next_choose;
      this.process.call(this);
    };
    var next_choose  = function(inNumSamples) {
      if (this._buffer.samples !== null) {
        if (this.inRates[1] === C.AUDIO) {
          if (this.inRates[2] === C.AUDIO) {
            this.process = next_kk; // aa
          } else {
            this.process = next_kk; // ak
          }
        } else {
          if (this.inRates[2] === C.AUDIO) {
            this.process = next_kk; // ka
          } else {
            this.process = next_kk; // kk
          }
        }
        this.process.call(this, inNumSamples);
      }
    };
    var next_kk = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var buf = this._buffer;
      var outs = this.outs;
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples     = buf.samples;
      var numChannels = buf.numChannels;
      var numFrames   = buf.numFrames;
      var index0, index1, index2, index3, frac, a, b, c, d, offset;

      var hi = numFrames - 1;
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        index1 = phase|0;
        index0 = index1 - 1;
        index2 = index1 + 1;
        index3 = index2 + 1;
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
        frac = phase - (phase|0);
        for (var j = 0, jmax = outs.length; j < jmax; ++j) {
          offset = numFrames * (j % numChannels);
          a = samples[index0 + offset];
          b = samples[index1 + offset];
          c = samples[index2 + offset];
          d = samples[index3 + offset];
          outs[j][i] = cubicinterp(frac, a, b, c, d);
        }
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0, this.tag);
      }
      this._phase = phase;
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("PlayBuf", PlayBuf);
    }
  };

});
