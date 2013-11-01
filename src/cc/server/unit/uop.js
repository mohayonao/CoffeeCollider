define(function(require, exports, module) {
  "use strict";

  var unit = require("./unit");
  var ops  = require("../../common/ops");
  
  var calcFunc = {};
  
  unit.specs.UnaryOpUGen = (function() {
    
    var ctor = function() {
      var func = calcFunc[ops.UNARY_OP_UGEN_MAP[this.specialIndex]];
      var process;
      if (func) {
        switch (this.inRates[0]) {
        case C.AUDIO  : process = func.a; break;
        case C.CONTROL: process = func.k; break;
        }
        this.process = process;
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = func(this.inputs[0][0]);
        }
      } else {
        console.log("UnaryOpUGen[" + this.specialIndex + "] is not defined.");
      }
    };
    
    return ctor;
  })();
  
  var unary_k = function(func) {
    return function() {
      this.outputs[0][0] = func(this.inputs[0][0]);
    };
  };
  var unary_a = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this.inputs[0];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a[i  ]); out[i+1] = func(a[i+1]);
        out[i+2] = func(a[i+2]); out[i+3] = func(a[i+3]);
        out[i+4] = func(a[i+4]); out[i+5] = func(a[i+5]);
        out[i+6] = func(a[i+6]); out[i+7] = func(a[i+7]);
      }
    };
  };
  
  var avoidzero = function(a) {
    if (-1e-6 < a && a < 0) {
      a = -1e-6;
    }
    if (0 <= a && a < +1e-6) {
      a = +1e-6;
    }
    return a;
  };
  
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return a > 0 ? 0 : 1;
  };
  calcFunc.abs = function(a) {
    return Math.abs(a);
  };
  calcFunc.ceil = function(a) {
    return Math.ceil(a);
  };
  calcFunc.floor = function(a) {
    return Math.floor(a);
  };
  calcFunc.frac = function(a) {
    if (a < 0) {
      return 1 + (a - (a|0));
    }
    return a - (a|0);
  };
  calcFunc.sign = function(a) {
    if (a === 0) {
      return 0;
    } else if (a > 0) {
      return 1;
    }
    return -1;
  };
  calcFunc.squared = function(a) {
    return a * a;
  };
  calcFunc.cubed = function(a) {
    return a * a * a;
  };
  calcFunc.sqrt = function(a) {
    return Math.sqrt(Math.abs(a));
  };
  calcFunc.exp = function(a) {
    return Math.exp(a);
  };
  calcFunc.reciprocal = function(a) {
    return 1 / avoidzero(a);
  };
  calcFunc.midicps = function(a) {
    return 440 * Math.pow(2, (a - 69) * 1/12);
  };
  calcFunc.cpsmidi = function(a) {
    return Math.log(Math.abs(avoidzero(a)) * 1/440) * Math.LOG2E * 12 + 69;
  };
  calcFunc.midiratio = function(a) {
    return Math.pow(2, a * 1/12);
  };
  calcFunc.ratiomidi = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E * 12;
  };
  calcFunc.dbamp = function(a) {
    return Math.pow(10, a * 0.05);
  };
  calcFunc.ampdb = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E * 20;
  };
  calcFunc.octcps = function(a) {
    return 440 * Math.pow(2, avoidzero(a) - 4.75);
  };
  calcFunc.cpsoct = function(a) {
    return Math.log(Math.abs(a) * 1/440) * Math.LOG2E + 4.75;
  };
  calcFunc.log = function(a) {
    return Math.log(Math.abs(avoidzero(a)));
  };
  calcFunc.log2 = function(a) {
    return Math.log2(Math.abs(avoidzero(a))) * Math.LOG2E;
  };
  calcFunc.log10 = function(a) {
    return Math.log2(Math.abs(avoidzero(a))) * Math.LOG10E;
  };
  calcFunc.sin = function(a) {
    return Math.sin(a);
  };
  calcFunc.cos = function(a) {
    return Math.cos(a);
  };
  calcFunc.tan = function(a) {
    return Math.tan(a);
  };
  calcFunc.rand = function(a) {
    return Math.random() * a;
  };
  calcFunc.rand2 = function(a) {
    return (Math.random() * 2 - 1) * a;
  };
  calcFunc.linrand = function(a) {
    return Math.min(Math.random(), Math.random()) * a;
  };
  calcFunc.bilinrand = function(a) {
    return (Math.random() - Math.random()) * a;
  };
  calcFunc.sum3rand = function(a) {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * a;
  };
  calcFunc.distort = function(a) {
    return a / (1 + Math.abs(a));
  };
  calcFunc.softclip = function(a) {
    var absa = Math.abs(a);
    return absa <= 0.5 ? a : (absa - 0.25) / a;
  };
  calcFunc.coin = function(a) {
    return Math.random() < a ? 1 : 0;
  };
  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };
  calcFunc.num = function(a) {
    return a;
  };
  calcFunc.pi = function(a) {
    return Math.PI * a;
  };
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
    if (!func.a) { func.a = unary_a(func); }
    if (!func.k) { func.k = unary_k(func); }
  });
  
  module.exports = {};

});
