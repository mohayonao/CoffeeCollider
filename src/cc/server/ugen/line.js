define(function(require, exports, module) {
  "use strict";
  
  var ugen = require("./ugen");
  
  var iLine = {
    ar: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(C.AUDIO, start, end, dur, doneAction).madd(mul, add);
      }
    },
    kr: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(C.CONTROL, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  var install = function() {
    ugen.register("Line", iLine);
  };
  
  module.exports = {
    install: install
  };

});
