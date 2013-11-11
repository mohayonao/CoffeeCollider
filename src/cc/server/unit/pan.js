define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var table = require("./table");
  var gSine = table.gSine;

  cc.unit.specs.Pan2 = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.AUDIO) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._pos   = this.inputs[1][0];
      this._level = this.inputs[2][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_aa.call(this, 1);
    };
    var next_ak = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      // var leftOut  = this.outputs[0];
      // var rightOut = this.outputs[1];
      // var inIn  = this.inputs[0];
      // var pos   = this.inputs[1][0];
      // var level = this.inputs[2][0];
      // var leftAmp  = this._leftAmp;
      // var rightAmp = this._rightAmp;
      // var i, _in;
      // if (pos !== this._pos || level !== this._level) {
      //   var ipos = (1024 * pos + 1024 + 0.5)|0;
      //   ipos = Math.max(0, Math.min(ipos, 2048));
      //   var nextLeftAmp  = level * gSine[2048 - ipos];
      //   var nextRightAmp = level * gSine[ipos];
      //   var slopeFactor = this.rate.slopeFactor;
      //   var leftAmp_slope  = (nextLeftAmp  - leftAmp ) * slopeFactor;
      //   var rightAmp_slope = (nextRightAmp - rightAmp) * slopeFactor;
      //   for (i = 0; i < inNumSamples; ++i) {
      //     _in = inIn[i];
      //     leftOut[i]  = _in * leftAmp;
      //     rightOut[i] = _in * rightAmp;
      //     leftAmp  += leftAmp_slope;
      //     rightAmp += rightAmp_slope;
      //   }
      //   this._pos = pos;
      //   this._level = level;
      //   this._leftAmp  = nextLeftAmp;
      //   this._rightAmp = nextRightAmp;
      // } else {
      //   for (i = 0; i < inNumSamples; ++i) {
      //     _in = inIn[i];
      //     leftOut[i]  = _in * leftAmp;
      //     rightOut[i] = _in * rightAmp;
      //   }
      // }
    };
    var next_aa = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
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

    return ctor;
  })();
  
  module.exports = {};

});
