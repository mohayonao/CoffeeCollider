define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var sc_wrap = require("./utils").sc_wrap;
  
  cc.ugen.specs.Trig = {
    $ar: {
      defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, dur]);
      }
    },
    $kr: {
        defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, dur]);
      }
    },
    signalRange: C.UNIPOLAR
  };
  
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
  
  cc.ugen.specs.Trig1 = cc.ugen.specs.Trig;
  
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
  
  cc.ugen.specs.Latch = {
    $ar: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, trig]);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, trig]);
      }
    }
  };
  
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
  
  cc.ugen.specs.Gate = cc.ugen.specs.Latch;
  
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
  
  cc.ugen.specs.ZeroCrossing = {
    $ar: {
      defaults: "trig=0",
      ctor: function(trig) {
        return cc.ugen.multiNewList(this, [C.AUDIO, trig]);
      }
    },
    $kr: {
      defaults: "trig=0",
      ctor: function(trig) {
        return cc.ugen.multiNewList(this, [C.CONTROL, trig]);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.ZeroCrossing = (function() {
    var ctor = function() {
      this.process = next;
      this._prevfrac = 0;
      this._previn  = this.inputs[0][0];
      this._counter = 0;
      this.outputs[0][0] = this._level = 0;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var previn   = this._previn;
      var prevfrac = this._prevfrac;
      var level   = this._level;
      var counter = this._counter;
      var sampleRate = this.rate.sampleRate;
      var curin, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        counter++;
        curin = inIn[i];
        if (counter > 4 && previn <= 0 && curin > 0) {
          frac = -previn / (curin - previn);
          level = sampleRate / (frac + counter - prevfrac);
          prevfrac = frac;
          counter  = 0;
        }
        out[i] = level;
        previn = curin;
      }
      this._previn   = previn;
      this._prevfrac = prevfrac;
      this._level    = level;
      this._counter  = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Timer = cc.ugen.specs.ZeroCrossing;

  cc.unit.specs.Timer = (function() {
    var ctor = function() {
      this.process = next;
      this._prevfrac = 0;
      this._previn  = this.inputs[0][0];
      this._counter = 0;
      this.outputs[0][0] = this._level = 0;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var previn   = this._previn;
      var prevfrac = this._prevfrac;
      var level   = this._level;
      var counter = this._counter;
      var sampleDur = this.rate.sampleDur;
      var curin, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        counter++;
        curin = inIn[i];
        if (previn <= 0 && curin > 0) {
          frac = -previn / (curin - previn);
          level = sampleDur * (frac + counter - prevfrac);
          prevfrac = frac;
          counter  = 0;
        }
        out[i] = level;
        previn = curin;
      }
      this._previn   = previn;
      this._prevfrac = prevfrac;
      this._level    = level;
      this._counter  = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Phasor = {
    $ar: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return cc.ugen.multiNewList(this, [C.AUDIO, trig, rate, start, end, resetPos]);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return cc.ugen.multiNewList(this, [C.AUDIO, trig, rate, start, end, resetPos]);
      }
    }
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
