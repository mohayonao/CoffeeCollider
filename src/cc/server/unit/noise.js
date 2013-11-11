define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.WhiteNoise = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() * 2 - 1;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
