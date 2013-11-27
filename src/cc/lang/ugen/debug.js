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
  
  module.exports = {};

});
