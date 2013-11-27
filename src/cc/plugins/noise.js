define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.WhiteNoise = {
    $ar: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL]).madd(mul, add);
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
        return cc.ugen.multiNewList(this, [C.AUDIO, density]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, density]).madd(mul, add);
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
        return cc.ugen.multiNewList(this, [C.AUDIO, freq]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq]).madd(mul, add);
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
  
  module.exports = {};

});
