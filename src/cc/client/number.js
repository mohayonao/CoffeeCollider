define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  
  var setup = function(selector, func) {
    fn.definePrototypeProperty(Number, selector, func);
    fn.definePrototypeProperty(Array, selector, function() {
      return this.map(function(x) { return x[selector](); });
    });
    fn.definePrototypeProperty(cc.UGen, selector, function() {
      return cc.createUnaryOpUGen(selector, this);
    });
  };
  
  
  module.exports = {
    exports: function() {
      setup("neg", function() {
        return -this;
      });
      setup("not", function() {
        return this === 0 ? 1 : 0;
      });
      setup("abs", function() {
        return Math.abs(this);
      });
      setup("ceil", function() {
        return Math.ceil(this);
      });
      setup("floor", function() {
        return Math.floor(this);
      });
      setup("frac", function() {
        if (this < 0) {
          return 1 + (this - (this|0));
        }
        return this - (this|0);
      });
      setup("sign", function() {
        if (this === 0) {
          return 0;
        } else if (this > 0) {
          return 1;
        }
        return -1;
      });
      setup("squared", function() {
        return this * this;
      });
      setup("cubed", function() {
        return this * this * this;
      });
      setup("sqrt", function() {
        return Math.sqrt(Math.abs(this));
      });
      setup("exp", function() {
        return Math.exp(this);
      });
      setup("reciprocal", function() {
        return 1 / this;
      });
      setup("midicps", function() {
        return 440 * Math.pow(2, (this - 69) * 1/12);
      });
      setup("cpsmidi", function() {
        return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
      });
      setup("midiratio", function() {
        return Math.pow(2, this * 1/12);
      });
      setup("ratiomidi", function() {
        return Math.log(Math.abs(this)) * Math.LOG2E * 12;
      });
      setup("dbamp", function() {
        return Math.pow(10, this * 0.05);
      });
      setup("ampdb", function() {
        return Math.log(Math.abs(this)) * Math.LOG10E * 20;
      });
      setup("octcps", function() {
        return 440 * Math.pow(2, this - 4.75);
      });
      setup("cpsoct", function() {
        return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
      });
      setup("log", function() {
        return Math.log(Math.abs(this));
      });
      setup("log2", function() {
        return Math.log(Math.abs(this)) * Math.LOG2E;
      });
      setup("log10", function() {
        return Math.log(Math.abs(this)) * Math.LOG10E;
      });
      setup("sin", function() {
        return Math.sin(this);
      });
      setup("cos", function() {
        return Math.cos(this);
      });
      setup("tan", function() {
        return Math.tan(this);
      });
      setup("asin", function() {
        return Math.asin(Math.max(-1, Math.min(this, 1)));
      });
      setup("acos", function() {
        return Math.acos(Math.max(-1, Math.min(this, 1)));
      });
      setup("atan", function() {
        return Math.atan(this);
      });
      setup("sinh", function() {
        return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
      });
      setup("cosh", function() {
        return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
      });
      setup("tanh", function() {
        return this.sinh() / this.cosh();
      });
      setup("rand", function() {
        return Math.random() * this;
      });
      setup("rand2", function() {
        return (Math.random() * 2 - 1) * this;
      });
      setup("linrand", function() {
        return Math.min(Math.random(), Math.random()) * this;
      });
      setup("bilinrand", function() {
        return (Math.random() - Math.random()) * this;
      });
      setup("sum3rand", function() {
        return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * this;
      });
      setup("distort", function() {
        return this / (1 + Math.abs(this));
      });
      setup("softclip", function() {
        var absa = Math.abs(this);
        return absa <= 0.5 ? this : (absa - 0.25) / this;
      });
      setup("coin", function() {
        return Math.random() < this;
      });
      
      setup("num", function() {
        return +this;
      });
      setup("tilde", function() {
        return ~this;
      });
      setup("pi", function() {
        return this * Math.PI;
      });
    }
  };

});
