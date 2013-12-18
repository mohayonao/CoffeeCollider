define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  var DebugUGen = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.AUDIO, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(C.CONTROL, _in);
      }
    }
  };
  
  cc.ugen.specs.Debug = DebugUGen;
  
  cc.unit.specs.Debug = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function() {
      this.outputs[0].set(this.inputs[0]);
      cc.global.console.log(this.outputs[0][0]);
    };
    return ctor;
  })();
  
  cc.ugen.specs.DebugNaN = DebugUGen;
  
  cc.unit.specs.DebugNaN = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var hasNaN = false;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = inIn[i];
        if (isNaN(inIn[i])) {
          hasNaN = true;
        }
      }
      if (hasNaN) {
        cc.global.console.log("NaN");
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
