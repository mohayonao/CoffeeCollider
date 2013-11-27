define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.FreeVerb = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, mix, room, damp]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, mix, room, damp]).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
