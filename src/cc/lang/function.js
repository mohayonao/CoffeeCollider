define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  var utils = require("./utils");
  var slice = [].slice;

  var asNumber = function(val) {
    val = val();
    if (typeof val !== "number" || isNaN(val)) {
      return 0;
    }
    return val;
  };
  
  // common methods
  fn.defineProperty(Function.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(Function.prototype, "dup", fn(function(n) {
    n |= 0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = this(i);
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Function.prototype, "do", function() {
    throw "not implemented";
  });
  
  fn.defineProperty(Function.prototype, "wait", function() {
    if (cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenFunction(this));
    }
    return this;
  });
  
  fn.defineProperty(Function.prototype, "asUGenInput", function() {
    return utils.asUGenInput(this());
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, function() {
      return asNumber(this)[selector]();
    });
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a) {
        if (typeof a[selector] === "function") {
          return a[selector]();
        }
        return a;
      };
    }
  });
  
  // binary operator methods
  ["__sub__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, function(b) {
      return asNumber(this)[selector](b);
    });
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a, b) {
        if (typeof a[selector] === "function") {
          return a[selector](b);
        }
        return a;
      };
    }
  });
  fn.defineProperty(Function.prototype, "__add__", function(b) {
    return this.toString() + b;
  });
  fn.defineProperty(Function.prototype, "__mul__", function(b) {
    if (typeof b === "function") {
      var f = this, g = b;
      return function() {
        return f.call(null, g.apply(null, arguments));
      };
    }
    return 0;
  });
  fn.defineBinaryProperty(Function.prototype, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.defineBinaryProperty(Function.prototype, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(asNumber(this), args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a) {
        if (typeof a[selector] === "function") {
          return a[selector].apply(a, slice.call(arguments, 1));
        }
        return a;
      };
    }
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
  
  module.exports = {};

});
