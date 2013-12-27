define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  var Buffer = (function() {
    function Buffer(bufnum, frames, channels) {
      this.bufnum     = bufnum;
      this.frames     = frames;
      this.channels   = channels;
      this.sampleRate = cc.server.sampleRate;
      this.samples    = new Float32Array(frames * channels);
    }
    Buffer.prototype.bindData = function(sampleRate, channels, frames, samples) {
      this.sampleRate = sampleRate;
      this.channels   = channels;
      this.frames     = frames;
      this.samples    = samples;
    };
    Buffer.prototype.zero = function() {
      var i, samples = this.samples;
      for (i = samples.length; i--; ) {
        samples[i] = 0;
      }
    };
    Buffer.prototype.set = function(params) {
      var samples = this.samples;
      var samples_length = samples.length;
      var index, value, values;
      var i, imax = params.length;
      var j, jmax;
      for (i = 0; i < imax; i += 2) {
        index = params[i];
        if (typeof index !== "number" || index < 0 || samples_length <= index) {
          continue;
        }
        index |= 0;
        value = params[i+1];
        if (typeof value === "number") {
          samples[index] = value || 0; // remove NaN
        } else if (Array.isArray(value)) {
          values = value;
          for (j = 0, jmax = values.length; j < jmax; ++j) {
            if (samples_length <= index + j) {
              break;
            }
            value = values[j];
            if (typeof value === "number") {
              samples[index + j] = value || 0; // remove NaN
            }
          }
        }
      }
    };
    Buffer.prototype.gen = function(cmd, flags, params) {
      var func = gen_func[cmd];
      if (func) {
        var samples = this.samples;
        var normalize = !!(flags & 1);
        var wavetable = !!(flags & 2);
        var clear     = !!(flags & 4);
        if (clear) {
          for (var i = samples.length; i--; ) {
            samples[i] = 0;
          }
        }
        func(samples, wavetable, params);
        if (normalize) {
          if (wavetable) {
            normalize_wsamples(samples.length, samples, 1);
          } else {
            normalize_samples(samples.length, samples, 1);
          }
        }
      }
    };
    return Buffer;
  })();

  var gen_func = {};
  
  gen_func.sine1 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wpartial(len, samples, i+1, params[i], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_partial(len, samples, i+1, params[i], 0);
      }
    }
  };
  
  gen_func.sine2 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_wpartial(len, samples, params[i], params[i+1], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_partial(len, samples, params[i], params[i+1], 0);
      }
    }
  };
  
  gen_func.sine3 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_wpartial(len, samples, params[i], params[i+1], params[i+2]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_partial(len, samples, params[i], params[i+1], params[i+2]);
      }
    }
  };

  gen_func.cheby = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wchebyshev(len, samples, i+1, params[i]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_chebyshev(len, samples, i+1, params[i]);
      }
    }
  };
  
  var add_wpartial = function(size, data, partial, amp, phase) {
    if (amp === 0) {
      return;
    }
    var size2 = size >> 1;
    var w = (partial * 2.0 * Math.PI) / size2;
    var cur = amp * Math.sin(phase);
    var next;
    phase += w;
    for (var i = 0; i < size; i += 2) {
      next = amp * Math.sin(phase);
      data[i] += 2 * cur - next;
      data[i+1] += next - cur;
      cur = next;
      phase += w;
    }
  };
  var add_partial = function(size, data, partial, amp, phase) {
    if (amp === 0) {
      return;
    }
    var w = (partial * 2.0 * Math.PI) / size;
    for (var i = 0; i < size; ++i) {
      data[i] += amp * Math.sin(phase);
      phase += w;
    }
  };
  var add_wchebyshev = function(size, data, partial, amp) {
    if (amp === 0) {
      return;
    }
    var size2 = size >> 1;
    var w = 2 / size2;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 0.5);
    var cur = amp * Math.cos(partial * Math.acos(phase)) - offset;
    var next;
    phase += w;
    for (var i = 0; i < size; i += 2) {
      next = amp * Math.cos(partial * Math.acos(phase)) - offset;
      data[i] += 2 * cur - next;
      data[i+1] += next - cur;
      cur = next;
      phase += w;
    }
  };
  var add_chebyshev = function(size, data, partial, amp) {
    if (amp === 0) {
      return;
    }
    var w = 2 / size;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 0.5);
    for (var i = 0; i < size; ++i) {
      data[i] += amp * Math.cos(partial * Math.acos(phase)) - offset;
      phase += w;
    }
  };

  var normalize_samples = function(size, data, peak) {
    var maxamp, absamp, ampfac, i;
    for (i = maxamp = 0; i < size; ++i) {
      absamp = Math.abs(data[i]);
      if (absamp > maxamp) { maxamp = absamp; }
    }
    if (maxamp !== 0 && maxamp !== peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };

  var normalize_wsamples = function(size, data, peak) {
    var maxamp, absamp, ampfac, i;
    for (i = maxamp = 0; i < size; i += 2) {
      absamp = Math.abs(data[i] + data[i+1]);
      if (absamp > maxamp) { maxamp = absamp; }
    }
    if (maxamp !== 0 && maxamp !== peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };
  
  cc.createServerBuffer = function(bufnum, frames, channels) {
    return new Buffer(bufnum, frames, channels);
  };
  
  module.exports = {
    Buffer: Buffer
  };

});
