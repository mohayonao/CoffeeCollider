define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  var BufferSource = (function() {
    function BufferSource(bufSrcId) {
      this.bufSrcId   = bufSrcId;
      this.channels   = 0;
      this.sampleRate = 0;
      this.frames     = 0;
      this.samples    = null;
      this.pendings   = [];
    }
    BufferSource.prototype.set = function(channels, sampleRate, frames, samples) {
      this.channels   = channels;
      this.sampleRate = sampleRate;
      this.frames     = frames;
      this.samples    = samples;
      this.pendings.forEach(function(items) {
        var buffer     = items[0];
        var startFrame = items[1];
        var frames  = items[2];
        buffer.bindBufferSource(this, startFrame, frames);
      }, this);
      this.pendings = null;
    };
    return BufferSource;
  })();
  
  var Buffer = (function() {
    function Buffer(bufnum, frames, channels) {
      this.bufnum     = bufnum;
      this.frames     = frames;
      this.channels   = channels;
      this.sampleRate = cc.server.sampleRate;
      this.samples    = new Float32Array(frames * channels);
    }
    Buffer.prototype.bindBufferSource = function(bufSrc, startFrame, frames) {
      startFrame = Math.max( 0, Math.min(startFrame|0, bufSrc.frames));
      frames     = Math.max(-1, Math.min(frames |0, bufSrc.frames - startFrame));
      if (startFrame === 0) {
        if (frames === -1) {
          this.samples = bufSrc.samples;
          this.frames  = bufSrc.frames;
        } else {
          this.samples = new Float32Array(bufSrc.samples.buffer, 0, frames);
          this.frames = frames;
        }
      } else {
        if (frames === -1) {
          this.samples = new Float32Array(bufSrc.samples.buffer, startFrame * 4);
          this.frames = bufSrc.frames - startFrame;
        } else {
          this.samples = new Float32Array(bufSrc.samples.buffer, startFrame * 4, frames);
          this.frames = frames;
        }
      }
      this.channels   = bufSrc.channels;
      this.sampleRate = bufSrc.sampleRate;
    };
    Buffer.prototype.zero = function() {
      var samples = this.samples;
      for (var i = samples.length; i--; ) {
        samples[i] = 0;
      }
    };
    Buffer.prototype.set = function(params) {
      var samples = this.samples;
      for (var i = 0, imax = params.length >> 1; i < imax; i += 2) {
        var index  = params[i];
        if (typeof index !== "number" || index < 0 || samples.length <= index) {
          continue;
        }
        index |= 0;
        var values = params[i+1];
        if (typeof values === "number") {
          if (isNaN(values)) {
            values = 0;
          }
          samples[index] = values;
        } else if (Array.isArray(values)) {
          for (var j = 0, jmax = values.length; j < jmax; ++j) {
            if (samples.length <= i + j) {
              break;
            }
            if (typeof values[j] === "number") {
              samples[index + j] = values[j];
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
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wpartial(samples.length, samples, i+1, params[i], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_partial(samples.length, samples, i+1, params[i], 0);
      }
    }
  };
  
  gen_func.sine2 = function(samples, wavetable, params) {
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_wpartial(samples.length, samples, params[i], params[i+1], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_partial(samples.length, samples, params[i], params[i+1], 0);
      }
    }
  };
  
  gen_func.sine3 = function(samples, wavetable, params) {
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_wpartial(samples.length, samples, params[i], params[i+1], params[i+2]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_partial(samples.length, samples, params[i], params[i+1], params[i+2]);
      }
    }
  };

  gen_func.cheby = function(samples, wavetable, params) {
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wchebyshev(samples.length, samples, i+1, params[i]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_chebyshev(samples.length, samples, i+1, params[i]);
      }
    }
  };
  
  var add_wpartial = function(size, data, partial, amp, phase) {
    if (amp === 0) { return; }
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
    if (amp === 0) { return; }
    var w = (partial * 2.0 * Math.PI) / size;
    for (var i = 0; i < size; ++i) {
      data[i] += amp * Math.sin(phase);
      phase += w;
    }
  };
  var add_wchebyshev = function(size, data, partial, amp) {
    if (amp === 0) { return; }
    var size2 = size >> 1;
    var w = 2 / size2;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 2);
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
    if (amp === 0) { return; }
    var w = 2 / size;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 2);
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
    if (maxamp !== 0 && maxamp === peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };

  var normalize_wsamples = function(size, data, peak) {
    var maxamp, absamp, ampfac, i;
    for (i = maxamp = 0; i < size; i += 2) {
      absamp = Math.abs(data[i]);
      if (absamp > maxamp) { maxamp = absamp; }
    }
    if (maxamp !== 0 && maxamp === peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };
  
  module.exports = {
    BufferSource: BufferSource,
    Buffer: Buffer
  };

});
