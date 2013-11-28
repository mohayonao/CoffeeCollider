define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Rand = {
    $new: {
      defaults: "lo=0,hi=1",
      ctor: function(lo, hi) {
        return this.multiNew(C.SCALAR, lo, hi);
      }
    }
  };

  cc.unit.specs.Rand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = Math.random() * range + lo;
    };
    return ctor;
  })();
  
  cc.ugen.specs.IRand = {
    $new: {
      defaults: "lo=0,hi=127",
      ctor: function(lo, hi) {
        return this.multiNew(C.SCALAR, lo, hi);
      }
    }
  };
  
  cc.unit.specs.IRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = (Math.random() * range + lo)|0;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TRand = {
    $ar: {
      defaults: "lo=0,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.AUDIO, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.CONTROL, lo, hi, trig);
      }
    }
  };
  
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
  
  cc.ugen.specs.TIRand = {
    $ar: {
      defaults: "lo=0,hi=127,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.AUDIO, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0,hi=127,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.CONTROL, lo, hi, trig);
      }
    }
  };
  
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
  
  cc.ugen.specs.LinRand = {
    $new: {
      defaults: "lo=0,hi=1,minmax=0",
      ctor: function(lo, hi, minmax) {
        return this.multiNew(C.SCALAR, lo, hi, minmax);
      }
    }
  };
  
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
  
  cc.ugen.specs.NRand = {
    $new: {
      defaults: "lo=0,hi=1,n=0",
      ctor: function(lo, hi, n) {
        return this.multiNew(C.SCALAR, lo, hi, n);
      }
    }
  };
  
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
  
  cc.ugen.specs.ExpRand = {
    $new: {
      defaults: "lo=0.01,hi=1",
      ctor: function(lo, hi) {
        return this.multiNew(C.SCALAR, lo, hi);
      }
    }
  };

  cc.unit.specs.ExpRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0] || 0.01;
      var hi = this.inputs[1][0];
      var ratio = hi / lo;
      this.outputs[0][0] = Math.pow(ratio, Math.random()) * lo;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TExpRand = {
    $ar: {
      defaults: "lo=0.01,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.AUDIO, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0.01,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(C.CONTROL, lo, hi, trig);
      }
    }
  };
  
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
  
  cc.ugen.specs.CoinGate = {
    $ar: {
      defaults: "prob=0,in=0",
      ctor: function(prob, _in) {
        return this.multiNew(C.AUDIO, prob, _in);
      }
    },
    $kr: {
      defaults: "prob=0,in=0",
      ctor: function(prob, _in) {
        return this.multiNew(C.CONTROL, prob, _in);
      }
    }
  };
  
  cc.unit.specs.CoinGate = (function() {
    var ctor = function() {
      if (this.calcRate === C.AUDIO) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._trig = this.inputs[1][0];
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[1];
      var prevTrig = this._trig;
      var prob   = this.inputs[0][0];
      var curTrig, level;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        level   = 0;
        if (prevTrig <= 0 && curTrig > 0) {
          if (Math.random() < prob) {
            level = curTrig;
          }
        }
        prevTrig = curTrig;
        out[i] = level;
      }
      this._trig = prevTrig;
    };
    var next_k = function() {
      var trig = this.inputs[1][0];
      var level = 0;
      if (trig > 0 && this._trig <= 0) {
        if (Math.random() < this.inputs[0][0]) {
          level = trig;
        }
      }
      this.outputs[0][0] = level;
      this._trig = trig;
    };
    return ctor;
  })();
  
  module.exports = {};

});
