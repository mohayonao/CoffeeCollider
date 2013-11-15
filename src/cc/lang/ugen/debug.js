define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Debug = {
    ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.AUDIO, _in);
      }
    },
    kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.CONTROL, _in);
      }
    }
  };
  
  module.exports = {};

});
