define(function(require, exports, module) {
  "use strict";
  
  var fn = require("./fn");
  var utils = require("./utils");
  
  // unary operator methods
  fn.definePrototypeProperty(String, "__plus__", function() {
    var num = +this;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(String, "__minus__", function() {
    var num = -this;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  
  // binary operator methods
  fn.setupBinaryOp(String, "__add__", function(b) {
    return this + b;
  });
  fn.setupBinaryOp(String, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });

  var repeat = (function() {
    var _repeat = function(s, n) {
      if (n < 1) {
        return "";
      }
      if (n % 2) {
        return _repeat(s, n - 1) + s;
      }
      var half = _repeat(s, n >> 1);
      return half + half;
    };
    return function(s, b) {
      if (b === Infinity) {
        throw new RangeError();
      }
      return _repeat(s, b|0);
    };
  })();
  
  fn.setupBinaryOp(String, "__mul__", function(b) {
    if (typeof b === "number") {
      return repeat(this, b);
    }
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(String, "__div__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
        return items.join("");
      });
    }
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(String, "__mod__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.floor(b)).map(function(items) {
        return items.join("");
      });
    }
    return 0; // avoid NaN
  });
  
  module.exports = {};

});
