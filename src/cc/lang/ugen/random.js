define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Rand = {
    $new: {
      defaults: "lo=0,hi=1",
      ctor: function(lo, hi) {
        return this.init(C.SCALAR, lo, hi);
      }
    }
  };
  
  module.exports = {};

});
