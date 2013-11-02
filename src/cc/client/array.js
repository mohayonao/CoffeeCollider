define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var ops = require("../common/ops");
  
  ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
    if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
      fn.definePrototypeProperty(Array, selector, function() {
        return this.map(function(x) { return x[selector](); });
      });
    }
  });
  
  module.exports = {
  };

});
