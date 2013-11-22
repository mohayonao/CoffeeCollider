define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");

  // unary operator methods
  fn.defineProperty(Boolean.prototype, "__plus__", function() {
    return +this;
  });
  fn.defineProperty(Boolean.prototype, "__minus__", function() {
    return -this;
  });

  // binary operator methods
  fn.defineProperty(Boolean.prototype, "__add__", function(b) {
    return this + b;
  });
  fn.defineProperty(Boolean.prototype, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Boolean.prototype, "__mul__", function(b) {
    var num = this * b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Boolean.prototype, "__div__", function(b) {
    var num = this / b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Boolean.prototype, "__mod__", function(b) {
    var num = this % b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.setupBinaryOp(Boolean, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Boolean, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });

  fn.defineProperty(Boolean.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults("n=2").build());
  
  module.exports = {};

});
