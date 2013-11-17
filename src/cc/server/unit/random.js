define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.Rand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = Math.random() * range + lo;
    };
    return ctor;
  })();
  
  module.exports = {};

});
