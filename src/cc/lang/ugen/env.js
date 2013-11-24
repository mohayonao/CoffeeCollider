define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Linen = {
    $kr: {
      defaults: "gate=1,attackTime=0.01,susLevel=1,releaseTime=1,doneAction=0",
      ctor: function(gate, attackTime, susLevel, releaseTime, doneAction) {
        return this.init(C.CONTROL, gate, attackTime, susLevel, releaseTime, doneAction);
      }
    }
  };
  
  module.exports = {};

});
