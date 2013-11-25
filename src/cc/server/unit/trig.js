define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

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
  
  module.exports = {};

});
