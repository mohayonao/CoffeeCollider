define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  // common methods
  fn.defineProperty(Boolean.prototype, "copy", function() {
    return this;
  });
  fn.defineProperty(Boolean.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  fn.defineProperty(Boolean.prototype, "asUGenInput", function() {
    return !!this;
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, function() {
      return (this ? 1 : 0)[selector]();
    });
  });

  // binary operator methods
  ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, function(b) {
      return (this ? 1 : 0)[selector](b);
    });
  });
  fn.defineBinaryProperty(Boolean.prototype, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.defineBinaryProperty(Boolean.prototype, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(this ? 1 : 0, args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });
  
  module.exports = {};

});
