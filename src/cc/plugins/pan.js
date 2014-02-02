define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var gSine = require("./utils").gSine;
  var slice = [].slice;
  
  cc.ugen.specs.Pan2 = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return this.multiNew(C.AUDIO, _in, pos, level);
      }
    },
    $kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return this.multiNew(C.CONTROL, _in, pos, level);
      }
    },
    init: function() {
      this.inputs = slice.call(arguments);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1)
      ];
      this.numOutputs = 2;
      return this.channels;
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 1);
    }
  };
  
  cc.unit.specs.Pan2 = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos   = this.inputs[1][0];
      this._level = this.inputs[2][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_a.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var leftOut  = this.outputs[0];
      var rightOut = this.outputs[1];
      var inIn  = this.inputs[0];
      var posIn = this.inputs[1];
      var nextLevel = this.inputs[2][0];
      var level = this._level;
      var i, _in, ipos, leftAmp, rightAmp;
      if (level !== nextLevel) {
        var level_slope = (nextLevel - level) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
          level += level_slope;
        }
        this._level = nextLevel;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
        }
      }
    };
    var next_k = function(inNumSamples) {
      var leftOut  = this.outputs[0];
      var rightOut = this.outputs[1];
      var inIn      = this.inputs[0];
      var nextPos   = this.inputs[1][0];
      var nextLevel = this.inputs[2][0];
      var leftAmp  = this._leftAmp;
      var rightAmp = this._rightAmp;
      var i, _in;
      if (this._pos !== nextPos || this._level !== nextLevel) {
        var ipos = (1024 * nextPos + 1024 + 0.5)|0;
        ipos = Math.max(0, Math.min(ipos, 2048));
        var nextLeftAmp  = nextLevel * gSine[2048 - ipos];
        var nextRightAmp = nextLevel * gSine[ipos];
        var slopeFactor = this.rate.slopeFactor;
        var leftAmp_slope  = (nextLeftAmp  - leftAmp ) * slopeFactor;
        var rightAmp_slope = (nextRightAmp - rightAmp) * slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
          leftAmp  += leftAmp_slope;
          rightAmp += rightAmp_slope;
        }
        this._pos      = nextPos;
        this._level    = nextLevel;
        this._leftAmp  = nextLeftAmp;
        this._rightAmp = nextRightAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
        }
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.XFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(C.AUDIO, inA, inB, pan, level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(C.CONTROL, inA, inB, pan, level);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };

  cc.unit.specs.XFade2 = (function() {
    var ctor = function() {
      if (this.inRates[2] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos   = this.inputs[2][0];
      this._level = this.inputs[3][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_k.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var posIn   = this.inputs[2];
      var nextLevel = this.inputs[3][0];
      var leftAmp   = this._leftAmp;
      var rightAmp  = this._rightAmp;
      var level     = this._level;
      var i, ipos;
      if (level !== nextLevel) {
        var level_slope = (nextLevel - this._level) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
          level += level_slope;
        }
        this._level = nextLevel;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
        }
      }
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var nextPos   = this.inputs[2][0];
      var nextLevel = this.inputs[3][0];
      var leftAmp   = this._leftAmp;
      var rightAmp  = this._rightAmp;
      var i;
      if (this._pos !== nextPos || this._level !== nextLevel) {
        var ipos = (1024 * nextPos + 1024 + 0.5)|0;
        ipos = Math.max(0, Math.min(ipos, 2048));
        var nextLeftAmp  = nextLevel * gSine[2048 - ipos];
        var nextRightAmp = nextLevel * gSine[ipos];
        var slopeFactor = this.rate.slopeFactor;
        var leftAmp_slope  = (nextLeftAmp  - leftAmp ) * slopeFactor;
        var rightAmp_slope = (nextRightAmp - rightAmp) * slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
          leftAmp  += leftAmp_slope;
          rightAmp += rightAmp_slope;
        }
        this._pos   = nextPos;
        this._level = nextLevel;
        this._leftAmp  = nextLeftAmp;
        this._rightAmp = nextRightAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
        }
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.LinXFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(C.AUDIO, inA, inB, pan).__mul__(level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(C.CONTROL, inA, inB, pan).__mul__(level);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };
  
  cc.unit.specs.LinXFade2 = (function() {
    var ctor = function() {
      if (this.inRates[2] === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos = Math.max(-1, Math.min(this.inputs[2][0], 1));
      this._amp = this._pos * 0.5 + 0.5;
      next_a.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var posIn   = this.inputs[2];
      var pos, amp;
      for (var i = 0; i < inNumSamples; ++i) {
        pos = Math.max(-1, Math.min(posIn[i], 1));
        amp = pos * 0.5 + 0.5;
        out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
      }
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var nextPos = this.inputs[2][0];
      var amp = this._amp;
      var i, pos;
      if (this._pos !== nextPos) {
        pos = Math.max(-1, Math.min(nextPos, 1));
        var nextAmp = pos * 0.5 + 0.5;
        var amp_slope = (nextAmp - amp) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
          amp += amp_slope;
        }
        this._pos = nextPos;
        this._amp = nextAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
        }
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
