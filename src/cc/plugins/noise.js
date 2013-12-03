define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  var cubicinterp = utils.cubicinterp;
  
  cc.ugen.specs.WhiteNoise = {
    $ar: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.multiNew(C.AUDIO).madd(mul, add);
      }
    },
    $kr: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.multiNew(C.CONTROL).madd(mul, add);
      }
    }
  };

  cc.unit.specs.WhiteNoise = (function() {
    var ctor = function() {
      this.process = next;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() * 2 - 1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.PinkNoise = cc.ugen.specs.WhiteNoise;
  
  cc.unit.specs.PinkNoise = (function() {
    var ctor = function() {
      this.process = next;
      var whites = new Uint8Array(5);
      for (var i = 0; i < 5; ++i) {
        whites[i] = ((Math.random() * 1073741824)|0) % 25;
      }
      this._whites = whites;
      this._key    = 0;
      next.call(this, 1);
    };
    var MAX_KEY = 31;
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var key = this._key|0, whites = this._whites;
      var last_key, sum, diff, i, j;
      for (i = 0; i < inNumSamples; ++i) {
        last_key = key++;
        if (key > MAX_KEY) {
          key = 0;
        }
        diff = last_key ^ key;
        for (j = sum = 0; j < 5; ++j) {
          if (diff & (1 << j)) {
            whites[j] = ((Math.random() * 1073741824)|0) % 25;
          }
          sum += whites[j];
        }
        out[i] = (sum * 0.01666666) - 1;
      }
      this._key = key;
    };
    return ctor;
  })();

  cc.ugen.specs.ClipNoise = cc.ugen.specs.WhiteNoise;
  
  cc.unit.specs.ClipNoise = (function() {
    var ctor = function() {
      this.process = next;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() < 0.5 ? -1 : +1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Dust = {
    $ar: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.multiNew(C.AUDIO, density).madd(mul, add);
      }
    },
    $kr: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.multiNew(C.CONTROL, density).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.Dust = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 1 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale : 0;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Dust2 = cc.ugen.specs.Dust;
  
  cc.unit.specs.Dust2 = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 2 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale - 1 : 0;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFNoise0 = {
    $ar: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(C.AUDIO, freq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(C.CONTROL, freq).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.LFNoise0 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = 0;
      this._counter = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          level = Math.random() * 2 - 1;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFNoise1 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFNoise1 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = Math.random() * 2 - 1;
      this._counter = 0;
      this._slope   = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var slope   = this._slope;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          var nextLevel = Math.random() * 2 - 1;
          slope = (nextLevel - level) / counter;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          level += slope;
        }
      } while (remain);
      this._level   = level;
      this._slope   = slope;
      this._counter = counter;
    };
    return ctor;
  })();

  cc.ugen.specs.LFNoise2 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFNoise2 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = 0;
      this._counter = 0;
      this._slope   = 0;
      this._curve   = 0;
      this._nextValue = Math.random() * 2 - 1;
      this._nextMidPt = this._nextValue * 0.5;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var slope   = this._slope;
      var curve   = this._curve;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          var value = this._nextValue;
          this._nextValue = Math.random() * 2 - 1;
          level = this._nextMidPt;
          this._nextMidPt = (this._nextValue + value) * 0.5;
          counter = Math.max(2, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          var fseglen = counter;
          curve = 2 * (this._nextMidPt - level - fseglen * slope) / (fseglen * fseglen + fseglen);
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          slope += curve;
          level += slope;
        }
      } while (remain);
      this._level   = level;
      this._slope   = slope;
      this._curve   = curve;
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFClipNoise = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFClipNoise = (function() {
    var ctor = function() {
      this.process = next;
      this._counter = 0;
      this._level   = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise0 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise0 = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._level = 0;
      this._phase = 0;
      next.call(this, 1);
    };
    
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() * 2 - 1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = smpdur * freq;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() * 2 - 1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise1 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise1 = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._phase = 0;
      this._prevLevel = 0;
      this._nextLevel = 0;
      next.call(this, 1);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var prevLevel = this._prevLevel;
      var nextLevel = this._nextLevel;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          prevLevel = nextLevel;
          nextLevel = Math.random() * 2 - 1;
        }
        out[i] = nextLevel + ( phase * (prevLevel - nextLevel) );
      }
      this._prevLevel = prevLevel;
      this._nextLevel = nextLevel;
      this._phase     = phase;
    };

    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var prevLevel = this._prevLevel;
      var nextLevel = this._nextLevel;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = freq * smpdur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          prevLevel = nextLevel;
          nextLevel = Math.random() * 2 - 1;
        }
        out[i] = nextLevel + ( phase * (prevLevel - nextLevel) );
      }
      this._prevLevel = prevLevel;
      this._nextLevel = nextLevel;
      this._phase     = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise3 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise3 = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._phase  = 0;
      this._levelA = 0;
      this._levelB = 0;
      this._levelC = 0;
      this._levelD = 0;
      next.call(this, 1);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var a = this._levelA;
      var b = this._levelB;
      var c = this._levelC;
      var d = this._levelD;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          a = b;
          b = c;
          c = d;
          d = Math.random() * 2 - 1;
        }
        out[i] = cubicinterp(1 - phase, a, b, c, d);
      }
      this._levelA = a;
      this._levelB = b;
      this._levelC = c;
      this._levelD = d;
      this._phase  = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var a = this._levelA;
      var b = this._levelB;
      var c = this._levelC;
      var d = this._levelD;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = freq * smpdur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          a = b;
          b = c;
          c = d;
          d = Math.random() * 2 - 1;
        }
        out[i] = cubicinterp(1 - phase, a, b, c, d);
      }
      this._levelA = a;
      this._levelB = b;
      this._levelC = c;
      this._levelD = d;
      this._phase  = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDClipNoise = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDClipNoise = (function() {
    var ctor = function() {
      if (this.inRates[0] === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._level = 0;
      this._phase = 0;
      next.call(this, 1);
    };
    
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = smpdur * freq;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    return ctor;
  })();

  module.exports = {};

});
