define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.Rand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = Math.random() * range + lo;
    };
    return ctor;
  })();

  cc.unit.specs.IRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = (Math.random() * range + lo)|0;
    };
    return ctor;
  })();

  cc.unit.specs.TRand = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = this._value = Math.random() * range + lo;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0];
        var hi = this.inputs[1][0];
        var range = hi - lo;
        out[0] = this._value = Math.random() * range + lo;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0];
          var hi = this.inputs[1][0];
          var range = hi - lo;
          out[i] = value = Math.random() * range + lo;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();

  cc.unit.specs.TIRand = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0]|0;
      var hi = this.inputs[1][0]|0;
      var range = hi - lo;
      this.outputs[0][0] = this._value = (Math.random() * range + lo)|0;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0]|0;
        var hi = this.inputs[1][0]|0;
        var range = hi - lo;
        out[0] = this._value = (Math.random() * range + lo)|0;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0]|0;
          var hi = this.inputs[1][0]|0;
          var range = hi - lo;
          out[i] = value = (Math.random() * range + lo)|0;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();
  
  cc.unit.specs.LinRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var n  = this.inputs[2][0]|0;
      var range = hi - lo;
      var a = Math.random();
      var b = Math.random();
      if (n <= 0) {
        this.outputs[0][0] = Math.min(a, b) * range + lo;
      } else {
        this.outputs[0][0] = Math.max(a, b) * range + lo;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.NRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var n  = this.inputs[2][0]|0;
      if (n) {
        var range = hi - lo;
        var sum = 0;
        for (var i = 0; i < n; ++i) {
          sum += Math.random();
        }
        this.outputs[0][0] = (sum/n) * range + lo;
      }
    };
    return ctor;
  })();

  cc.unit.specs.ExpRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0] || 0.01;
      var hi = this.inputs[1][0];
      var ratio = hi / lo;
      this.outputs[0][0] = Math.pow(ratio, Math.random()) * lo;
    };
    return ctor;
  })();
  
  cc.unit.specs.TExpRand = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0] || 0.01;
      var hi = this.inputs[1][0];
      var ratio = hi / lo;
      this.outputs[0][0] = this._value = Math.pow(ratio, Math.random()) * lo;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0] || 0.01;
        var hi = this.inputs[1][0];
        var ratio = hi / lo;
        out[0] = this._value = Math.pow(ratio, Math.random()) * lo;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0] || 0.01;
          var hi = this.inputs[1][0];
          var ratio = hi / lo;
          out[i] = value = Math.pow(ratio, Math.random()) * lo;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();
  
  module.exports = {};

});
