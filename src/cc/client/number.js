define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils = require("./utils");
  
  fn.definePrototypeProperty(Number, "neg", function() {
    return -this;
  });
  fn.definePrototypeProperty(Number, "not", function() {
    return this === 0 ? 1 : 0;
  });
  fn.definePrototypeProperty(Number, "abs", function() {
    return Math.abs(this);
  });
  fn.definePrototypeProperty(Number, "ceil", function() {
    return Math.ceil(this);
  });
  fn.definePrototypeProperty(Number, "floor", function() {
    return Math.floor(this);
  });
  fn.definePrototypeProperty(Number, "frac", function() {
    if (this < 0) {
      return 1 + (this - (this|0));
    }
    return this - (this|0);
  });
  fn.definePrototypeProperty(Number, "sign", function() {
    if (this === 0) {
      return 0;
    } else if (this > 0) {
      return 1;
    }
    return -1;
  });
  fn.definePrototypeProperty(Number, "squared", function() {
    return this * this;
  });
  fn.definePrototypeProperty(Number, "cubed", function() {
    return this * this * this;
  });
  fn.definePrototypeProperty(Number, "sqrt", function() {
    return Math.sqrt(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "exp", function() {
    return Math.exp(this);
  });
  fn.definePrototypeProperty(Number, "reciprocal", function() {
    return 1 / this;
  });
  fn.definePrototypeProperty(Number, "midicps", function() {
    return 440 * Math.pow(2, (this - 69) * 1/12);
  });
  fn.definePrototypeProperty(Number, "cpsmidi", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
  });
  fn.definePrototypeProperty(Number, "midiratio", function() {
    return Math.pow(2, this * 1/12);
  });
  fn.definePrototypeProperty(Number, "ratiomidi", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E * 12;
  });
  fn.definePrototypeProperty(Number, "dbamp", function() {
    return Math.pow(10, this * 0.05);
  });
  fn.definePrototypeProperty(Number, "ampdb", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E * 20;
  });
  fn.definePrototypeProperty(Number, "octcps", function() {
    return 440 * Math.pow(2, this - 4.75);
  });
  fn.definePrototypeProperty(Number, "cpsoct", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
  });
  fn.definePrototypeProperty(Number, "log", function() {
    return Math.log(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "log2", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E;
  });
  fn.definePrototypeProperty(Number, "log10", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E;
  });
  fn.definePrototypeProperty(Number, "sin", function() {
    return Math.sin(this);
  });
  fn.definePrototypeProperty(Number, "cos", function() {
    return Math.cos(this);
  });
  fn.definePrototypeProperty(Number, "tan", function() {
    return Math.tan(this);
  });
  fn.definePrototypeProperty(Number, "asin", function() {
    return Math.asin(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "acos", function() {
    return Math.acos(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "atan", function() {
    return Math.atan(this);
  });
  fn.definePrototypeProperty(Number, "sinh", function() {
    return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "cosh", function() {
    return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "tanh", function() {
    return this.sinh() / this.cosh();
  });
  fn.definePrototypeProperty(Number, "rand", function() {
    return Math.random() * this;
  });
  fn.definePrototypeProperty(Number, "rand2", function() {
    return (Math.random() * 2 - 1) * this;
  });
  fn.definePrototypeProperty(Number, "linrand", function() {
    return Math.min(Math.random(), Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "bilinrand", function() {
    return (Math.random() - Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "sum3rand", function() {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * this;
  });
  fn.definePrototypeProperty(Number, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.definePrototypeProperty(Number, "coin", function() {
    return Math.random() < this;
  });
  fn.definePrototypeProperty(Number, "num", function() {
    return +this;
  });
  fn.definePrototypeProperty(Number, "tilde", function() {
    return ~this;
  });
  fn.definePrototypeProperty(Number, "pi", function() {
    return this * Math.PI;
  });
  
  
  fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults("mul=1,add=0").multiCall().build());
  
  fn.definePrototypeProperty(Array, "madd", fn(function(mul, add) {
    return utils.flop([this, mul, add]).map(function(items) {
      var _in = items[0], mul = items[1], add = items[2];
      return cc.createMulAdd(_in, mul, add);
    });
  }).defaults("mul=1,add=0").multiCall().build());
  
  module.exports = {};

});
