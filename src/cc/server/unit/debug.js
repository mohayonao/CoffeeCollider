define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.Debug = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = inIn[i];
      }
      console.log(out[0]);
    };
    return ctor;
  })();
  
  module.exports = {};

});
