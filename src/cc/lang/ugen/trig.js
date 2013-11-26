define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Trig = {
    signalRange: C.UNIPOLAR,
    $ar: {
      defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.init(C.AUDIO, _in, dur);
      }
    },
    $kr: {
        defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.init(C.CONTROL, _in, dur);
      }
    }
  };
  
  cc.ugen.specs.Trig1 = cc.ugen.specs.Trig;
  
  cc.ugen.specs.Latch = {
    $ar: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.init(C.AUDIO, _in, trig);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.init(C.CONTROL, _in, trig);
      }
    }
  };
  
  cc.ugen.specs.Gate = cc.ugen.specs.Latch;

  cc.ugen.specs.Phasor = {
    $ar: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.init(C.AUDIO, trig, rate, start, end, resetPos);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.init(C.AUDIO, trig, rate, start, end, resetPos);
      }
    }
  };
  
  module.exports = {};

});
