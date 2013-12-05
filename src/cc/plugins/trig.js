define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var sc_wrap = require("./utils").sc_wrap;
  
  cc.ugen.specs.Trig = {
    $ar: {
      defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.multiNew(C.AUDIO, _in, dur);
      }
    },
    $kr: {
        defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.multiNew(C.CONTROL, _in, dur);
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
        return this.multiNew(C.AUDIO, _in, trig);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(C.CONTROL, _in, trig);
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

  cc.ugen.specs.PulseCount = {
    $ar: {
      defaults: "trig=0,reset=0",
      ctor: function(trig, reset) {
        return this.multiNew(C.AUDIO, trig, reset);
      }
    },
    $kr: {
      defaults: "trig=0,reset=0",
      ctor: function(trig, reset) {
        return this.multiNew(C.CONTROL, trig, reset);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.PulseCount = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level += 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;

      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = 0;
      } else if (prevtrig <= 0 && curtrig > 0) {
        level += 1;
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level += 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.Peak = {
    $ar: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(C.AUDIO, _in, trig);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(C.CONTROL, _in, trig);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Peak = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = Math.abs(inIn[i]);
        out[i] = level = Math.max(inlevel, level);
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = Math.abs(inIn[0]);
      out[0] = level = Math.max(inlevel, level);
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = Math.abs(inIn[i]);
        out[i] = level = Math.max(inlevel, level);
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.RunningMin = cc.ugen.specs.Peak;
  
  cc.unit.specs.RunningMin = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel < level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = inIn[0];
      if (inlevel < level) {
        level = inlevel;
      }
      out[0] = level;
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel < level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RunningMax = cc.ugen.specs.Peak;

  cc.unit.specs.RunningMax = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel > level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = inIn[0];
      if (inlevel > level) {
        level = inlevel;
      }
      out[0] = level;
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel > level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.Stepper = {
    $ar: {
      defaults: "trig=0,reset=0,min=0,max=7,step=1,resetval",
      ctor: function(trig, reset, min, max, step, resetval) {
        if (typeof resetval === "undefined") {
          resetval = min;
        }
        return this.multiNew(C.AUDIO, trig, reset, min, max, step, resetval);
      }
    },
    $kr: {
      defaults: "trig=0,reset=0,min=0,max=7,step=1,resetval",
      ctor: function(trig, reset, min, max, step, resetval) {
        if (typeof resetval === "undefined") {
          resetval = min;
        }
        return this.multiNew(C.CONTROL, trig, reset, min, max, step, resetval);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Stepper = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level     = this.inputs[5][0];
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var zmin = this.inputs[2][0];
      var zmax = this.inputs[3][0];
      var step = this.inputs[4][0];
      var resetval = this.inputs[5][0];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level    = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = sc_wrap(resetval, zmin, zmax);
        } else if (prevtrig <= 0 && curtrig > 0) {
          level = sc_wrap(level + step, zmin, zmax);
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level    = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var zmin = this.inputs[2][0];
      var zmax = this.inputs[3][0];
      var step = this.inputs[4][0];
      var resetval = this.inputs[5][0];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level    = this._level;
      var curtrig, curreset;

      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = sc_wrap(resetval, zmin, zmax);
      } else if (prevtrig <= 0 && curtrig > 0) {
        level = sc_wrap(level + step, zmin, zmax);
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = sc_wrap(level + step, zmin, zmax);
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level    = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.PulseDivider = {
    $ar: {
      defaults: "trig=0,div=2,start=0",
      ctor: function(trig, div, start) {
        return this.multiNew(C.AUDIO, trig, div, start);
      }
    },
    $kr: {
      defaults: "trig=0,div=2,start=0",
      ctor: function(trig, div, start) {
        return this.multiNew(C.CONTROL, trig, div, start);
      }
    }
  };

  cc.unit.specs.PulseDivider = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this._level    = 0;
      this._counter  = Math.floor(this.inputs[2][0] + 0.5);
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var div    = this.inputs[1][0]|0;
      var prevtrig = this._prevtrig;
      var counter  = this._counter;
      var z, curtrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          counter++;
          if (counter >= div) {
            counter = 0;
            z = 1;
          } else {
            z = 0;
          }
        } else {
          z = 0;
        }
        out[i] = z;
        prevtrig = curtrig;
      }
      this._counter  = counter;
      this._prevtrig = prevtrig;
    };
    return ctor;
  })();

  cc.ugen.specs.SetResetFF = cc.ugen.specs.PulseCount;

  cc.unit.specs.SetResetFF = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level = 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      
      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = 0;
      } else if (prevtrig <= 0 && curtrig > 0) {
        level = 1;
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    
    return ctor;
  })();

  cc.ugen.specs.ToggleFF = {
    $ar: {
      defaults: "trig=0",
      ctor: function(trig) {
        return this.multiNew(C.AUDIO, trig);
      }
    },
    $kr: {
      defaults: "trig=0",
      ctor: function(trig) {
        return this.multiNew(C.CONTROL, trig);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.ToggleFF = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = 1 - level;
        }
        out[i] = level;
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ZeroCrossing = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.AUDIO, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.CONTROL, _in);
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

  cc.ugen.specs.Sweep = {
    $ar: {
      defaults: "trig=0,rate=1",
      ctor: function(trig, rate) {
        return this.multiNew(C.AUDIO, trig, rate);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1",
      ctor: function(trig, rate) {
        return this.multiNew(C.CONTROL, trig, rate);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Sweep = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = this.inputs[0][0];
      this._level = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var rate   = this.inputs[1][0] * this.rate.sampleDur;
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          frac = -prevtrig / (curtrig - prevtrig);
          level = frac * rate;
        } else {
          level += rate;
        }
        out[i] = level;
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Phasor = {
    $ar: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.multiNew(C.AUDIO, trig, rate, start, end, resetPos);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.multiNew(C.CONTROL, trig, rate, start, end, resetPos);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.Phasor = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = this.inputs[0][0];
      this.outputs[0][0] = this._level = this.inputs[2][0];
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var rate   = this.inputs[1][0];
      var start  = this.inputs[2][0];
      var end    = this.inputs[3][0];
      var resetPos = this.inputs[4][0];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          frac = 1 - prevtrig / (curtrig - prevtrig);
          level = resetPos + frac * rate;
        }
        out[i] = level;
        level += rate;
        level = sc_wrap(level, start, end);
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.PeakFollower = {
    $ar: {
      defaults: "in=0,decay=0.999",
      ctor: function(_in, decay) {
        return this.multiNew(C.AUDIO, _in, decay);
      }
    },
    $kr: {
      defaults: "in=0,decay=0.999",
      ctor: function(_in, decay) {
        return this.multiNew(C.CONTROL, _in, decay);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.PeakFollower = (function() {
    var ctor = function() {
      this.process = next;
      this._decay = this.inputs[1][0];
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn  = this.inputs[0];
      var decay = this.inputs[1][0];
      var level = this._level;
      var i, inlevel;
      if (decay === this._decay) {
        for (i = 0; i < inNumSamples; ++i) {
          inlevel = Math.abs(inIn[i]);
          if (inlevel >= level) {
            level = inlevel;
          } else {
            level = inlevel + decay * (level - inlevel);
          }
          out[i] = level;
        }
      } else {
        var decay_slope = (decay - this._decay) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          inlevel = Math.abs(inIn[i]);
          if (inlevel >= level) {
            level = inlevel;
          } else {
            level = (1 - Math.abs(decay)) * inlevel + decay * level;
            decay += decay_slope;
          }
          out[i] = level;
        }
      }
      this._level = level;
      this._decay = decay;
    };
    return ctor;
  })();
  
  module.exports = {};

});
