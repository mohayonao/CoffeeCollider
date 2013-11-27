define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Debug = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]);
      }
    }
  };
  
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
  
  module.exports = {};

});
