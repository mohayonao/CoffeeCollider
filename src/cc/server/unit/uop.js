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
      inNumSamples = inNumSamples|0;
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

  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return a > 0 ? 0 : 1;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
    if (!func.a) { func.a = unary_a(func); }
    if (!func.k) { func.k = unary_k(func); }
  });
  
  module.exports = {};

});
