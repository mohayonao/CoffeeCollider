define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");

  // unary operator methods
  fn.definePrototypeProperty(Function, "__plus__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__minus__", function() {
    return 0; // avoid NaN
  });

  // binary operator methods
  fn.definePrototypeProperty(Function, "__add__", function(b) {
    return this.toString() + b;
  });
  fn.definePrototypeProperty(Function, "__sub__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__mul__", function(b) {
    if (typeof b === "function") {
      var f = this, g = b;
      return function() {
        return f.call(null, g.apply(null, arguments));
      };
    }
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__div__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__mod__", function() {
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(Function, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Function, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });

  // others
  fn.definePrototypeProperty(Function, "play", function() {
    var func = this;
    return cc.createSynthDef(
      function() {
        cc.createOut(C.AUDIO, 0, func());
      }, []
    ).play();
  });
  
  module.exports = {};

});
