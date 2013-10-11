define(function(require, exports, module) {
  "use strict";

  var c = {};

  c.SCALAR  = 0;
  c.CONTROL = 1;
  c.AUDIO   = 2;

  c.UNARY_OP_UGEN_MAP = "num neg not tilde".split(" ");
  c.BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");

  module.exports = c;

});
