define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  
  // unary operator methods
  fn.defineProperty(Date.prototype, "__plus__", function() {
    return +this;
  });
  fn.defineProperty(Date.prototype, "__minus__", function() {
    return -this;
  });

  // binary operator methods
  fn.defineProperty(Date.prototype, "__add__", function(b) {
    return this + b;
  });
  fn.defineProperty(Date.prototype, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Date.prototype, "__mul__", function(b) {
    var num = this * b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Date.prototype, "__div__", function(b) {
    var num = this / b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.defineProperty(Date.prototype, "__mod__", function(b) {
    var num = this % b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.setupBinaryOp(Date, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Date, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  module.exports = {};

});
