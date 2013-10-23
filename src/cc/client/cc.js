define(function(require, exports, module) {
  "use strict";

  var _cc = require("../cc");
  var Emitter = require("../common/emitter").Emitter;
  
  if (!_cc.emit) {
    Emitter.bind(_cc);
  }
  
  module.exports = _cc;

});
