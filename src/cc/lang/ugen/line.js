define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  cc.ugen.specs.Line = {
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

  cc.ugen.specs.XLine = {
    ar: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(C.AUDIO, start, end, dur, doneAction).madd(mul, add);
      }
    },
    kr: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(C.CONTROL, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
