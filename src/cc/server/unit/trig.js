define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.Trig = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO && this.inRates[0] !== C.AUDIO) {
        this.process = next_k;
      } else {
        this.process = next;
      }
      this._counter = 0;
      this._trig = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out    = this.outputs[0];
      var trigIn = this.inputs[0];
      var dur    = this.inputs[1][0];
      var sr = this.rate.sampleRate;
      var trig  = this._trig;
      var level = this._level;
      var counter = this._counter;
      var curTrig, zout;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (counter > 0) {
          zout = --counter ? level : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = level = curTrig;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
      this._level   = level;
    };
    var next_k = function(inNumSamples) {
      var out    = this.outputs[0];
      var trigIn = this.inputs[0];
      var dur    = this.inputs[1][0];
      var sr = this.rate.sampleRate;
      var trig  = this._trig;
      var level = this._level;
      var counter = this._counter;
      var curTrig, zout;
      curTrig = trigIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (counter > 0) {
          zout = --counter ? level : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = level = curTrig;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = curTrig;
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();

  cc.unit.specs.Trig1 = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO && this.inRates[0] !== C.AUDIO) {
        this.process = next_k;
      } else {
        this.process = next;
      }
      this._counter = 0;
      this._trig    = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out     = this.outputs[0];
      var trigIn  = this.inputs[0];
      var dur     = this.inputs[1][0];
      var sr      = this.rate.sampleRate;
      var trig    = this._trig;
      var counter = this._counter;
      var curTrig, zout;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (counter > 0) {
          zout = --counter ? 1 : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = 1;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
    };
    var next_k = function(inNumSamples) {
      var out     = this.outputs[0];
      var trigIn  = this.inputs[0];
      var dur     = this.inputs[1][0];
      var sr      = this.rate.sampleRate;
      var trig    = this._trig;
      var counter = this._counter;
      var curTrig, zout;
      curTrig = trigIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (counter > 0) {
          zout = --counter ? 1 : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = 1;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.unit.specs.Latch = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._trig  = 0;
      this._level = 0;
      this.outputs[0][0] = this.inputs[1][0] > 0 ? this.inputs[0][0] : 0;
    };
    var next_aa = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var trig  = this._trig;
      var level = this._level;
      var curTrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (trig <= 0 && curTrig > 0) {
          level = inIn[i];
        }
        out[i] = level;
        trig   = curTrig;
      }
      this._trig  = trig;
      this._level = level;
    };
    var next_ak = function(inNumSamples) {
      var out   = this.outputs[0];
      var level = this._level;
      var trig  = this.inputs[0][1];
      if (this._trig <= 0 && trig > 0) {
        level = this.inputs[0][0];
      }
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = level;
      }
      this._trig  = trig;
      this._level = level;
    };
    return ctor;
  })();

  cc.unit.specs.Gate = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_aa = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var level  = this._level;
      var curTrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (curTrig > 0) {
          level = inIn[i];
        }
        out[i] = level;
      }
      this._level = level;
    };
    var next_ak = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trig   = this.inputs[1][0];
      var level  = this._level;
      var i;
      if (trig > 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level = inIn[i];
        }
        this._level = level;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
        }
      }
    };
    return ctor;
  })();
  
  var sc_wrap = function(val, lo, hi) {
    if (lo > hi) {
      var t = lo;
      lo = hi;
      hi = t;
    }
    var _in = val, range;
    if (_in >= hi) {
      range = hi - lo;
      _in -= range;
      if (_in < hi) {
        return _in;
      }
    } else if (_in < lo) {
      range = hi - lo;
      _in += range;
      if (_in >= lo) {
        return _in;
      }
    } else {
      return _in;
    }
    
    if (hi === lo) {
      return lo;
    }
    return _in - range * Math.floor((_in - lo) / range);
  };
  
  cc.unit.specs.Phasor = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next;
      }
      this._prev = this.inputs[0][0];
      this.outputs[0][0] = this._level = this.inputs[2][0];
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trig  = this.inputs[0][0];
      var rate  = this.inputs[1][0];
      var start = this.inputs[2][0];
      var end   = this.inputs[3][0];
      var prev  = this._prev;
      var level = this._level;
      if (prev <= 0 && trig > 0) {
        level = this.inputs[4][0];
      }
      for (var i = 0; i < inNumSamples; ++i) {
        level = sc_wrap(level, start, end);
        out[i] = level;
        level += rate;
      }
      this._prev  = trig;
      this._level = level;
    };
    return ctor;
  })();
  
  module.exports = {};

});
