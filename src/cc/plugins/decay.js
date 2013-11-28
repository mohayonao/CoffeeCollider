define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var log001 = Math.log(0.001);
  
  cc.ugen.specs.Integrator = {
    $ar: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.AUDIO, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(C.CONTROL, _in, coef).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.Integrator = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var nextB1 = this.inputs[1][0];
      var b1 = this._b1;
      var y1 = this._y1;
      var i;
      if (b1 === nextB1) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
        }
      } else {
        var b1_slope = (nextB1 - b1) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
          b1 += b1_slope;
        }
        this._b1 = nextB1;
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Decay = {
    $ar: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.multiNew(C.AUDIO, _in, decayTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.multiNew(C.CONTROL, _in, decayTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Decay = (function() {
    var ctor = function() {
      this.process = next;
      this._decayTime = undefined;
      this._b1 = 0;
      this._y1 = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var decayTime = this.inputs[1][0];
      var b1 = this._b1;
      var y1 = this._y1;
      var i;
      if (decayTime === this._decayTime) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
        }
      } else {
        var next_b1 = decayTime === 0 ? 0 : Math.exp(log001 / (decayTime * this.rate.sampleRate));
        this._decayTime = decayTime;
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
          b1 += b1_slope;
        }
        this._b1 = next_b1;
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Decay2 = {
    $ar: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.multiNew(C.AUDIO, _in, attackTime, decayTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.multiNew(C.CONTROL, _in, attackTime, decayTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Decay2 = (function() {
    var ctor = function() {
      this.process = next;
      this._attackTime = undefined;
      this._decayTime  = undefined;
      this._b1a = 0;
      this._b1b = 0;
      this._y1a = 0;
      this._y1b = 0;
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var attackTime = this.inputs[1][0];
      var decayTime  = this.inputs[2][0];
      var b1a = this._b1a;
      var b1b = this._b1b;
      var y1a = this._y1a;
      var y1b = this._y1b;
      var i;
      if (attackTime === this._attackTime && decayTime === this._decayTime) {
        for (i = 0; i < inNumSamples; ++i) {
          y1a = inIn[i] + b1a * y1a;
          y1b = inIn[i] + b1b * y1b;
          out[i] = (y1a - y1b);
        }
      } else {
        this._decayTime  = decayTime;
        this._attackTime = attackTime;
        var next_b1a = decayTime  === 0 ? 0 : Math.exp(log001 / (decayTime  * this.rate.sampleRate));
        var next_b1b = attackTime === 0 ? 0 : Math.exp(log001 / (attackTime * this.rate.sampleRate));
        var b1a_slope = (next_b1a - b1a) * this.rate.slopeFactor;
        var b1b_slope = (next_b1b - b1b) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          y1a = inIn[i] + b1a * y1a;
          y1b = inIn[i] + b1b * y1b;
          out[i] = (y1a - y1b);
          b1a += b1a_slope;
          b1b += b1b_slope;
        }
        b1a = next_b1a;
        b1b = next_b1b;
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._b1a = b1a;
      this._b1b = b1b;
    };
    return ctor;
  })();
  
  module.exports = {};

});
