define(function(require, exports, module) {
  "use strict";

  var _cc = require("../cc");
  var emitter = require("../common/emitter");
  
  if (!_cc.emit) {
    emitter.mixin(_cc);
  }
  
  module.exports = _cc;

});
