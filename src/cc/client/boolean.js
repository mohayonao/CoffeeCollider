define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");

  // unary operator methods
  fn.definePrototypeProperty(Boolean, "__plus__", function() {
    return +this;
  });
  fn.definePrototypeProperty(Boolean, "__minus__", function() {
    return -this;
  });

  // binary operator methods
  fn.definePrototypeProperty(Boolean, "__add__", function(b) {
    return this + b;
  });
  fn.definePrototypeProperty(Boolean, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__mul__", function(b) {
    var num = this * b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__div__", function(b) {
    var num = this / b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__mod__", function(b) {
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
  
  module.exports = {};

});
