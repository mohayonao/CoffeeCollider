define(function(require, exports, module) {
  "use strict";

  var UNARY_OP_UGEN_MAP = "num neg not tilde pi abs midicps cpsmidi ampdb dbamp coin".split(" ");
  var BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");
  
  module.exports = {
    UNARY_OP_UGEN_MAP : UNARY_OP_UGEN_MAP,
    BINARY_OP_UGEN_MAP: BINARY_OP_UGEN_MAP,
  };

});
