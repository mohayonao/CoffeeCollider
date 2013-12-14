define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  // common methods
  fn.defineProperty(Date.prototype, "copy", function() {
    return new Date(+this);
  });
  
  fn.defineProperty(Date.prototype, "clone", fn(function() {
    return new Date(+this);
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Date.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Date.prototype, "do", function(func) {
    var flag = Date.now() > (+this);
    if (flag) {
      if (cc.instanceOfSyncBlock(func)) {
        if (cc.currentSyncBlockHandler) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsBoolean(true));
        } else {
          func.clone().perform(flag);
        }
      } else {
        func(flag);
      }
    }
    return this;
  });
  
  fn.defineProperty(Date.prototype, "wait", function() {
    var flag = Date.now() > (+this);
    if (flag && cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenDate(this));
    }
    return this;
  });
  
  fn.defineProperty(Date.prototype, "asUGenInput", function() {
    return +this;
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, function() {
      return (+this)[selector]();
    });
  });

  // binary operator methods
  ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, function(b) {
      return (+this)[selector](b);
    });
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(+this, args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });
  
  module.exports = {};

});
