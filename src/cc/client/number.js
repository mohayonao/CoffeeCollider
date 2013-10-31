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
      setup("pi", function() {
        return this * Math.PI;
      });
      setup("abs", function() {
        return Math.abs(this);
      });
      setup("midicps", function() {
        return 440 * Math.pow(2, (this - 69) * 1/12);
      });
      setup("cpsmidi", function() {
        return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
      });
      setup("ampdb", function() {
        return Math.log(this) * Math.LOG10E * 20;
      });
      setup("dbamp", function() {
        return Math.pow(10, this * 0.05);
      });
      setup("coin", function() {
        return Math.random() < this;
      });
    }
  };

});
