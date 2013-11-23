define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  var slice = [].slice;

  // unary operator methods
  fn.defineProperty(Function.prototype, "__plus__", function() {
    return 0; // avoid NaN
  });
  fn.defineProperty(Function.prototype, "__minus__", function() {
    return 0; // avoid NaN
  });

  // binary operator methods
  fn.defineProperty(Function.prototype, "__add__", function(b) {
    return this.toString() + b;
  });
  fn.defineProperty(Function.prototype, "__sub__", function() {
    return 0; // avoid NaN
  });
  fn.defineProperty(Function.prototype, "__mul__", function(b) {
    if (typeof b === "function") {
      var f = this, g = b;
      return function() {
        return f.call(null, g.apply(null, arguments));
      };
    }
    return 0; // avoid NaN
  });
  fn.defineProperty(Function.prototype, "__div__", function() {
    return 0; // avoid NaN
  });
  fn.defineProperty(Function.prototype, "__mod__", function() {
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(Function, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Function, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });

  // others
  fn.defineProperty(Function.prototype, "play", function() {
    var func = this;
    return cc.global.SynthDef(
      function() {
        cc.global.Out(C.AUDIO, 0, func());
      }, []
    ).play();
  });
  
  fn.defineProperty(Function.prototype, "dup", fn(function(n) {
    n |= 0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = this(i);
    }
    return a;
  }).defaults("n=2").build());
  
  // global method
  ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
    if (!cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a) {
        if (typeof a[selector] === "function") {
          return a[selector]();
        }
        return a;
      };
    }
  });

  ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
    if (!cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a, b) {
        if (typeof a[selector] === "function") {
          return a[selector](b);
        }
        return a;
      };
    }
  });

  [
    "rrand", "exprand", "madd",
    "linlin", "linexp", "explin", "expexp",
  ].forEach(function(selector) {
    if (!cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function() {
        var a = arguments[0];
        if (typeof a[selector] === "function") {
          return a[selector].apply(a, slice.call(arguments, 1));
        }
        return a;
      };
    }
  });
  
  module.exports = {};

});
